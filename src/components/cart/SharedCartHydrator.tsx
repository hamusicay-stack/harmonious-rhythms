import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { fetchSharedCartItems } from "@/lib/sharedCart";

const PARAM = "shared_cart";

export function SharedCartHydrator() {
  const { add } = useCart();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get(PARAM);
    if (!token) return;
    handled.current = true;

    (async () => {
      try {
        const items = await fetchSharedCartItems(token);
        if (!items.length) {
          toast.error("העגלה המשותפת ריקה או לא תקפה");
        } else {
          for (const it of items) await add({ ...it, qty: 1 });
          toast.success("העגלה המשותפת נטענה בהצלחה!");
        }
      } catch (e: any) {
        toast.error(e?.message ?? "שגיאה בטעינת העגלה המשותפת");
      } finally {
        url.searchParams.delete(PARAM);
        window.history.replaceState({}, "", url.toString());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
