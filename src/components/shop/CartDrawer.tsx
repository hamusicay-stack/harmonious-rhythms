import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Trash2, Plus, Minus, Share2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { formatILS } from "@/lib/shopUtils";
import { encodeSharedCart, isShareableItem } from "@/lib/sharedCart";
import { toast } from "sonner";
import { useState } from "react";

export function CartDrawer() {
  const { items, count, subtotal, setQty, remove } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const goCheckout = () => {
    setOpen(false);
    navigate({ to: "/shop/checkout" });
  };

  const handleShare = async () => {
    const shareable = items.filter(isShareableItem);
    const skipped = items.length - shareable.length;
    if (!shareable.length) {
      toast.error("אין בעגלה מוצרים מלאים שניתן לשתף");
      return;
    }
    const token = encodeSharedCart(shareable);
    const url = `${window.location.origin}/shop?shared_cart=${encodeURIComponent(token)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "עגלת קניות משותפת", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("הקישור הועתק ללוח");
      }
      if (skipped > 0) {
        toast.message(`${skipped} פריטים חלקיים לא נכללו בשיתוף`);
      }
    } catch {
      // user cancelled share — ignore
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="עגלת קניות">
          <ShoppingBag className="h-4 w-4" />
          {count > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-primary px-1 text-[10px] text-primary-foreground border-0">
              {count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-full flex-col px-3 sm:max-w-md sm:px-6" dir="rtl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            עגלת הקניות {count > 0 && <span className="text-muted-foreground">({count})</span>}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
            <p className="font-semibold">העגלה ריקה</p>
            <p className="text-sm text-muted-foreground">הוסף מוצרים כדי להמשיך</p>
            <Link to="/shop" onClick={() => setOpen(false)}>
              <Button variant="outline" className="mt-2">לחנות</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-3">
              <ul className="space-y-3">
                {items.map((it) => (
                  <li key={it.id} className="flex gap-3 rounded-lg border p-2">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {it.image ? (
                        <img src={it.image} alt={it.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><ShoppingBag className="h-6 w-6 text-muted-foreground/40" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/shop/$slug"
                        params={{ slug: it.slug }}
                        onClick={() => setOpen(false)}
                        className="line-clamp-1 text-sm font-semibold hover:text-primary"
                      >
                        {it.title}
                      </Link>
                      <div className="mt-1 text-sm font-bold text-primary">{formatILS(it.price * it.qty)}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(it.id, it.qty - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{it.qty}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(it.id, it.qty + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button size="icon" variant="ghost" className="h-10 w-10 -mr-1" onClick={() => remove(it.id)} aria-label="הסר מוצר">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <SheetFooter className="border-t pt-4">
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">סכום ביניים</span>
                  <span className="text-lg font-bold">{formatILS(subtotal)}</span>
                </div>
                <Button onClick={goCheckout} className="w-full" size="lg">
                  המשך לתשלום
                </Button>
                <Button onClick={handleShare} variant="outline" className="w-full gap-2" size="sm">
                  <Share2 className="h-4 w-4" />
                  שתף עגלה
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
