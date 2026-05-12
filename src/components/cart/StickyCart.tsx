import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingCart, FileWarning } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { formatILS } from "@/lib/shopUtils";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = [
  "/shop/checkout",
  "/admin",
  "/auth",
  "/reset-password",
  "/verify",
];

/**
 * Global sticky cart bar — visible on every public page whenever the cart
 * has items. Reads exclusively from CartContext and routes to the unified
 * checkout flow.
 */
export function StickyCart() {
  const { items, count, subtotal } = useCart();
  const { pathname } = useLocation();

  if (count === 0) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const needsInfoFile = items.some((i) => i.requires_info_file);
  const distinctTypes = new Set(items.map((i) => i.product_type));
  const mixed = distinctTypes.size > 1;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/60",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      role="region"
      aria-label="עגלת קניות"
    >
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <span className="absolute -top-2 -right-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs text-muted-foreground">
              {mixed ? "עגלה משולבת — חנות + BEAT" : count === 1 ? "פריט אחד בעגלה" : `${count} פריטים בעגלה`}
            </div>
            <div className="text-lg font-bold leading-tight">{formatILS(subtotal)}</div>
          </div>
          {needsInfoFile && (
            <span
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
              title="נדרשת העלאת קובץ זיהוי בקופה"
            >
              <FileWarning className="h-3 w-3" />
              נדרש קובץ זיהוי
            </span>
          )}
        </div>

        <Link to="/shop/checkout">
          <Button size="lg" className="gap-2">
            <ShoppingCart className="h-5 w-5" />
            לקופה
          </Button>
        </Link>
      </div>
    </div>
  );
}
