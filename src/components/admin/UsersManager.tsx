import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, Search, MoreVertical, ShieldCheck, Ban, UserCheck,
  ExternalLink, KeyRound, UserCog, Crown,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

type AppRole = "user" | "member" | "premium" | "vip" | "admin" | "moderator";
const ALL_ROLES: AppRole[] = ["user", "member", "premium", "vip", "moderator", "admin"];

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  subscription_tier: string | null;
  roles: string[];
};

export function UsersManager() {
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banSaving, setBanSaving] = useState(false);

  const [rolesTarget, setRolesTarget] = useState<UserRow | null>(null);
  const [rolesDraft, setRolesDraft] = useState<Set<string>>(new Set());
  const [rolesSaving, setRolesSaving] = useState(false);

  // Subscription management (SSoT: profiles.global_subscription_tier_id)
  type TierOpt = { id: string; slug: string; name: string; rank: number; is_vip: boolean };
  const [tiers, setTiers] = useState<TierOpt[]>([]);
  const [subTarget, setSubTarget] = useState<UserRow | null>(null);
  const [subCurrentTierId, setSubCurrentTierId] = useState<string | null>(null);
  const [subDraftTierId, setSubDraftTierId] = useState<string>("__none__");
  const [subSaving, setSubSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as never as {
        from: (t: string) => { select: (c: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: TierOpt[] | null }> } };
      }).from("subscription_tiers").select("id, slug, name, rank, is_vip").order("rank", { ascending: true });
      setTiers(data ?? []);
    })();
  }, []);

  const openSubscription = async (u: UserRow) => {
    setSubTarget(u);
    const { data: prof } = await supabase
      .from("profiles")
      .select("global_subscription_tier_id")
      .eq("id", u.id)
      .maybeSingle();
    const tid = (prof as { global_subscription_tier_id?: string | null } | null)?.global_subscription_tier_id ?? null;
    setSubCurrentTierId(tid);
    setSubDraftTierId(tid ?? "__none__");
  };

  const saveSubscription = async () => {
    if (!subTarget) return;
    setSubSaving(true);
    const tierId = subDraftTierId === "__none__" ? null : subDraftTierId;
    const { error } = await (supabase as never as {
      rpc: (n: string, args: { _user_id: string; _tier_id: string | null }) => Promise<{ error: { message: string } | null }>;
    }).rpc("admin_set_user_global_tier", {
      _user_id: subTarget.id,
      _tier_id: tierId,
    });
    setSubSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("המנוי עודכן");
    setSubTarget(null);
    load();
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users", {
      _search: search || undefined,
      _limit: 200,
      _offset: 0,
    });
    if (error) toast.error(friendlyError(error));
    setRows((data as UserRow[]) ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const openRoles = (u: UserRow) => {
    setRolesTarget(u);
    setRolesDraft(new Set(u.roles));
  };

  const saveRoles = async () => {
    if (!rolesTarget) return;
    setRolesSaving(true);
    const current = new Set(rolesTarget.roles);
    const next = rolesDraft;
    const toAdd = [...next].filter(r => !current.has(r));
    const toRemove = [...current].filter(r => !next.has(r));
    try {
      for (const r of toAdd) {
        const { error } = await supabase.rpc("admin_set_user_role", {
          _user_id: rolesTarget.id, _role: r as AppRole, _revoke: false,
        });
        if (error) throw error;
      }
      for (const r of toRemove) {
        const { error } = await supabase.rpc("admin_set_user_role", {
          _user_id: rolesTarget.id, _role: r as AppRole, _revoke: true,
        });
        if (error) throw error;
      }
      toast.success("ההרשאות עודכנו");
      setRolesTarget(null);
      load();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setRolesSaving(false);
    }
  };

  const confirmBan = async () => {
    if (!banTarget) return;
    setBanSaving(true);
    const { error } = await supabase.rpc("admin_set_user_ban", {
      _user_id: banTarget.id,
      _banned: !banTarget.is_banned,
      _reason: banTarget.is_banned ? undefined : (banReason || undefined),
    });
    setBanSaving(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(banTarget.is_banned ? "המשתמש שוחרר מהשעיה" : "המשתמש הושעה");
    setBanTarget(null);
    setBanReason("");
    load();
  };

  const impersonate = (u: UserRow) => {
    toast.info(`בקשת התחזות נרשמה (${u.display_name || u.email}). תכונה זו דורשת חיבור Service Role בצד שרת ותיבנה בהמשך.`);
  };

  const roleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: "bg-destructive/15 text-destructive border-destructive/40",
      moderator: "bg-orange-500/15 text-orange-600 border-orange-500/40",
      vip: "bg-amber-500/15 text-amber-600 border-amber-500/40",
      premium: "bg-purple-500/15 text-purple-600 border-purple-500/40",
      member: "bg-blue-500/15 text-blue-600 border-blue-500/40",
      user: "bg-muted text-muted-foreground border-border",
    };
    return (
      <Badge key={role} variant="outline" className={variants[role] || variants.user}>
        {role}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          ניהול משתמשים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="חפש לפי שם, שם משתמש או אימייל..."
              className="pr-10"
            />
          </div>
          <Button type="submit" variant="secondary">חיפוש</Button>
          {search && (
            <Button type="button" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); }}>
              נקה
            </Button>
          )}
        </form>

        <div className="text-xs text-muted-foreground">
          {loading ? "טוען..." : `${rows.length} משתמשים`}
        </div>

        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">משתמש</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">הרשאות</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">נרשם</TableHead>
                <TableHead className="text-right w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                </TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  לא נמצאו משתמשים
                </TableCell></TableRow>
              ) : rows.map((u) => (
                <TableRow key={u.id} className={u.is_banned ? "opacity-60" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback>{(u.display_name || u.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.display_name || "—"}</div>
                        {u.username && <div className="text-xs text-muted-foreground truncate">@{u.username}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length > 0 ? u.roles.map(roleBadge) : <span className="text-xs text-muted-foreground">user</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.is_banned ? (
                      <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/40">
                        <Ban className="ml-1 h-3 w-3" />מושעה
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/40">
                        פעיל
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("he-IL") : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{u.display_name || u.username || "משתמש"}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {u.username && (
                          <DropdownMenuItem asChild>
                            <a href={`/u/${u.username}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="ml-2 h-4 w-4" />צפה בפרופיל
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openRoles(u)}>
                          <KeyRound className="ml-2 h-4 w-4" />נהל הרשאות
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openSubscription(u)}>
                          <Crown className="ml-2 h-4 w-4 text-amber-500" />ניהול מנוי
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => impersonate(u)} disabled={u.id === currentUser?.id}>
                          <UserCheck className="ml-2 h-4 w-4" />התחזה למשתמש
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => { setBanTarget(u); setBanReason(""); }}
                          disabled={u.id === currentUser?.id}
                          className={u.is_banned ? "" : "text-destructive focus:text-destructive"}
                        >
                          {u.is_banned ? (<><UserCheck className="ml-2 h-4 w-4" />בטל השעיה</>) : (<><Ban className="ml-2 h-4 w-4" />השעה משתמש</>)}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Ban dialog */}
      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {banTarget?.is_banned ? "ביטול השעיה" : "השעיית משתמש"}
            </DialogTitle>
            <DialogDescription>
              {banTarget?.is_banned
                ? `שחרור ${banTarget?.display_name || banTarget?.email} מהשעיה.`
                : `${banTarget?.display_name || banTarget?.email} לא יוכל להיכנס או לבצע פעולות במערכת.`}
            </DialogDescription>
          </DialogHeader>
          {!banTarget?.is_banned && (
            <div className="space-y-2">
              <Label>סיבת ההשעיה (אופציונלי)</Label>
              <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3} placeholder="לדוגמה: הפרת תקנון..." />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanTarget(null)}>ביטול</Button>
            <Button
              variant={banTarget?.is_banned ? "default" : "destructive"}
              onClick={confirmBan}
              disabled={banSaving}
            >
              {banSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {banTarget?.is_banned ? "שחרר" : "השעה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles dialog */}
      <Dialog open={!!rolesTarget} onOpenChange={(o) => !o && setRolesTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              ניהול הרשאות
            </DialogTitle>
            <DialogDescription>
              {rolesTarget?.display_name || rolesTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-3 rounded-md border border-border/60 p-3 cursor-pointer hover:bg-accent">
                <Checkbox
                  checked={rolesDraft.has(r)}
                  onCheckedChange={(v) => {
                    setRolesDraft((prev) => {
                      const next = new Set(prev);
                      if (v === true) next.add(r); else next.delete(r);
                      return next;
                    });
                  }}
                />
                <div className="flex-1">{roleBadge(r)}</div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRolesTarget(null)}>ביטול</Button>
            <Button onClick={saveRoles} disabled={rolesSaving}>
              {rolesSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription dialog — SSoT: profiles.global_subscription_tier_id */}
      <Dialog open={!!subTarget} onOpenChange={(o) => !o && setSubTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <Crown className="h-5 w-5 text-amber-500" />
              ניהול מנוי
            </DialogTitle>
            <DialogDescription className="text-right">
              עדכון דרגת המנוי הגלובלית של {subTarget?.display_name || subTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-right">
            <Label>בחר דרגה</Label>
            <Select value={subDraftTierId} onValueChange={setSubDraftTierId}>
              <SelectTrigger><SelectValue placeholder="בחר דרגה" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">ללא מנוי</SelectItem>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.is_vip ? "👑 " : ""}{t.name} <span className="text-xs text-muted-foreground">· rank {t.rank}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              מקור אמת יחיד: <code>profiles.global_subscription_tier_id</code>. השינוי נכנס לתוקף מיידית בכל המודולים (אקדמיה, חנות, יומן, יד 2).
            </p>
            {subCurrentTierId && (
              <div className="text-[11px] text-amber-300">
                דרגה נוכחית: {tiers.find((t) => t.id === subCurrentTierId)?.name ?? "—"}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSubTarget(null)}>ביטול</Button>
            <Button onClick={saveSubscription} disabled={subSaving} className="bg-gradient-to-br from-amber-400 to-amber-600 text-black hover:brightness-110">
              {subSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              שמור מנוי
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
