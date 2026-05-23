import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HandCoins, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Schema = z.object({
  amount: z.number().positive("יש להזין סכום חיובי").max(10_000_000, "סכום גבוה מדי"),
  message: z.string().trim().max(500).optional(),
});

interface Props {
  listingId: string;
  sellerId: string;
  listingTitle: string;
  listingPrice: number;
}

export function MakeOfferDialog({ listingId, sellerId, listingTitle, listingPrice }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!user) { toast.error("יש להתחבר כדי להגיש הצעה"); return; }
    if (user.id === sellerId) { toast.error("לא ניתן להגיש הצעה למודעה שלך"); return; }

    const parsed = Schema.safeParse({ amount: Number(amount), message: message.trim() || undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "קלט לא תקין"); return; }

    setBusy(true);
    try {
      // 1. Insert offer
      const { data: offer, error: offerErr } = await supabase
        .from("marketplace_offers")
        .insert({
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: sellerId,
          offer_amount: parsed.data.amount,
          buyer_message: parsed.data.message ?? null,
          status: "pending",
        })
        .select("id")
        .single();
      if (offerErr) throw offerErr;

      // 2. Find or create chat thread
      let { data: thread } = await supabase
        .from("marketplace_chat_threads")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", user.id)
        .maybeSingle();
      if (!thread) {
        const { data: created, error: thErr } = await supabase
          .from("marketplace_chat_threads")
          .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId })
          .select("id")
          .single();
        if (thErr) throw thErr;
        thread = created;
      }

      // 3. Send system-style message into thread (as buyer)
      const body = `🤝 הצעת מחיר חדשה: ₪${parsed.data.amount.toLocaleString()}${
        parsed.data.message ? `\n${parsed.data.message}` : ""
      }`;
      await supabase.from("marketplace_chat_messages").insert({
        thread_id: thread!.id,
        sender_id: user.id,
        body,
      });

      toast.success("ההצעה נשלחה למוכר");
      setOpen(false);
      setAmount("");
      setMessage("");
    } catch (e: any) {
      toast.error(e?.message ?? "שליחת ההצעה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold">
          <HandCoins className="h-4 w-4" />הגש הצעת מחיר
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-end">הגשת הצעת מחיר</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="text-muted-foreground line-clamp-1">{listingTitle}</div>
            <div className="text-xs text-muted-foreground mt-1">מחיר מבוקש: <span className="font-semibold text-primary">₪{listingPrice.toLocaleString()}</span></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-amount">סכום ההצעה (₪)</Label>
            <Input
              id="offer-amount"
              type="number"
              inputMode="numeric"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="לדוגמה: 7500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-msg">הודעה למוכר (אופציונלי)</Label>
            <Textarea
              id="offer-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="מוכן לאסוף היום, מזומן ביד..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>ביטול</Button>
          <Button onClick={onSubmit} disabled={busy || !amount}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
            שלח הצעה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
