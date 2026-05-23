import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listForumTags, createForumTag, type ForumTagRow } from "@/lib/forum/tags.functions";
import { useUserRoles } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ShieldAlert, Tag as TagIcon, X } from "lucide-react";
import { toast } from "sonner";

const MAX_TAGS = 5;

export function TopicTagManager({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const fetchTags = useServerFn(listForumTags);
  const createTag = useServerFn(createForumTag);
  const qc = useQueryClient();
  const roles = useUserRoles() ?? [];
  const isStaff = roles.includes("admin") || (roles as string[]).includes("moderator");

  const tagsQ = useQuery({
    queryKey: ["forum", "tags", "all"],
    queryFn: () => fetchTags({}),
  });

  const allTags: ForumTagRow[] = tagsQ.data?.tags ?? [];
  const byId = useMemo(() => new Map(allTags.map((t) => [t.id, t])), [allTags]);
  const groups = useMemo(() => {
    const parents = allTags.filter((t) => !t.parent_id);
    const childrenOf = (pid: string) => allTags.filter((t) => t.parent_id === pid);
    return parents.map((p) => ({ parent: p, children: childrenOf(p.id) }));
  }, [allTags]);

  const selected = value.map((id) => byId.get(id)).filter(Boolean) as ForumTagRow[];

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
      return;
    }
    if (value.length >= MAX_TAGS) {
      toast.error(`ניתן לבחור עד ${MAX_TAGS} תגיות`);
      return;
    }
    onChange([...value, id]);
  };

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStaff, setNewStaff] = useState(false);
  const [newParent, setNewParent] = useState<string>("");

  const submitNewTag = async () => {
    if (newName.trim().length < 2) return;
    try {
      const r = await createTag({
        data: {
          name: newName.trim(),
          isStaffOnly: isStaff ? newStaff : false,
          parentId: isStaff && newParent ? newParent : null,
        },
      });
      setNewName("");
      setNewStaff(false);
      setNewParent("");
      await qc.invalidateQueries({ queryKey: ["forum", "tags", "all"] });
      if (value.length < MAX_TAGS) onChange([...value, r.id]);
      toast.success("התגית נוצרה");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-sm font-medium">תגיות ({value.length}/{MAX_TAGS})</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              <TagIcon className="h-3.5 w-3.5 ms-1" />
              בחר תגיות
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <ScrollArea className="max-h-[320px]">
              <div className="p-3 space-y-3">
                {tagsQ.isLoading && <div className="text-xs text-muted-foreground">טוען…</div>}
                {groups.length === 0 && !tagsQ.isLoading && (
                  <div className="text-xs text-muted-foreground">אין תגיות עדיין.</div>
                )}
                {groups.map(({ parent, children }) => (
                  <div key={parent.id} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">
                        {parent.name}
                      </span>
                      {parent.is_staff_only && (
                        <Badge variant="outline" className="border-red-500/50 text-red-400 text-[10px] px-1 py-0">
                          <ShieldAlert className="h-2.5 w-2.5 ms-0.5" />
                          צוות
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <TagToggle tag={parent} active={value.includes(parent.id)} onClick={() => toggle(parent.id)} />
                      {children.map((c) => (
                        <TagToggle key={c.id} tag={c} active={value.includes(c.id)} onClick={() => toggle(c.id)} />
                      ))}
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t border-border space-y-2">
                  <Label className="text-xs">צור תגית חדשה</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="שם תגית"
                    maxLength={40}
                    className="h-8 text-sm"
                  />
                  {isStaff && (
                    <>
                      <select
                        value={newParent}
                        onChange={(e) => setNewParent(e.target.value)}
                        className="w-full h-8 text-sm rounded-md border border-input bg-background px-2"
                      >
                        <option value="">— ללא קטגוריה אב —</option>
                        {allTags.filter((t) => !t.parent_id).map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox checked={newStaff} onCheckedChange={(v) => setNewStaff(v === true)} />
                        תגית של צוות בלבד (מוסתרת ממשתמשים)
                      </label>
                    </>
                  )}
                  <Button type="button" size="sm" className="w-full" onClick={submitNewTag} disabled={newName.trim().length < 2}>
                    <Plus className="h-3.5 w-3.5 ms-1" />
                    הוסף
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selected.map((t) => (
            <Badge
              key={t.id}
              variant="outline"
              className={
                t.is_staff_only
                  ? "border-red-500/60 bg-red-500/10 text-red-400 gap-1"
                  : "border-amber-400/40 bg-amber-500/10 text-amber-300 gap-1"
              }
            >
              {t.is_staff_only && <ShieldAlert className="h-3 w-3" />}
              {t.name}
              <button
                type="button"
                onClick={() => toggle(t.id)}
                className="hover:text-foreground"
                aria-label="הסר"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function TagToggle({ tag, active, onClick }: { tag: ForumTagRow; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-xs px-2 py-1 rounded-full border transition-colors " +
        (active
          ? tag.is_staff_only
            ? "border-red-500/60 bg-red-500/15 text-red-300"
            : "border-amber-400/60 bg-amber-500/15 text-amber-300"
          : tag.is_staff_only
          ? "border-red-500/30 text-red-400/80 hover:bg-red-500/10"
          : "border-border text-foreground/80 hover:bg-accent")
      }
    >
      {tag.is_staff_only && <ShieldAlert className="inline h-3 w-3 ms-1" />}
      {tag.name}
    </button>
  );
}

/** Read-only tag chip strip used in topic headers. */
export function TopicTagStrip({ tags }: { tags: ForumTagRow[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tags.map((t) => (
        <Badge
          key={t.id}
          variant="outline"
          className={
            t.is_staff_only
              ? "border-red-500/60 bg-red-500/10 text-red-400 gap-1"
              : "border-amber-400/40 bg-amber-500/10 text-amber-300 gap-1"
          }
        >
          {t.is_staff_only && <ShieldAlert className="h-3 w-3" />}
          {t.name}
        </Badge>
      ))}
    </div>
  );
}
