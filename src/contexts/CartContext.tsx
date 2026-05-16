import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  image: string | null;
  qty: number;
  product_type: string;
  requires_info_file?: boolean;
  info_file_extension?: string | null;
};

export type AppliedCoupon = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_amount: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  // Discount engine — SSoT: subscription_tiers.shop_discount_percent
  vipDiscountPercent: number;
  vipDiscountAmount: number;
  coupon: AppliedCoupon | null;
  couponDiscountAmount: number;
  // Points redemption
  pointsBalance: number;
  pointsPerNis: number;
  pointsToRedeem: number;
  pointsDiscountAmount: number;
  maxRedeemablePoints: number;
  setPointsToRedeem: (n: number) => void;
  totalDiscount: number;
  total: number;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "shop_cart";

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [vipDiscountPercent, setVipDiscountPercent] = useState(0);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsPerNis, setPointsPerNis] = useState(100);
  const [pointsToRedeem, setPointsToRedeemState] = useState(0);

  // Track logged-in user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUserId(sess?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Resolve VIP shop discount from profile -> subscription_tiers (SSoT)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) { setVipDiscountPercent(0); return; }
      const { data: prof } = await supabase
        .from("profiles")
        .select("global_subscription_tier_id")
        .eq("id", userId)
        .maybeSingle();
      const tierId = (prof as any)?.global_subscription_tier_id;
      if (!tierId) { if (!cancelled) setVipDiscountPercent(0); return; }
      const { data: tier } = await (supabase as any)
        .from("subscription_tiers")
        .select("shop_discount_percent")
        .eq("id", tierId)
        .maybeSingle();
      if (!cancelled) setVipDiscountPercent(Number((tier as any)?.shop_discount_percent ?? 0) || 0);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Load user points balance + global exchange rate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: settings } = await (supabase as any)
        .from("points_settings").select("points_per_nis").eq("id", 1).maybeSingle();
      if (!cancelled) setPointsPerNis(Number((settings as any)?.points_per_nis ?? 100) || 100);
      if (!userId) { if (!cancelled) setPointsBalance(0); return; }
      const { data: up } = await (supabase as any)
        .from("user_points").select("total_points").eq("user_id", userId).maybeSingle();
      if (!cancelled) setPointsBalance(Number((up as any)?.total_points ?? 0) || 0);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Helper: load cart rows from DB into state
  const loadFromDb = useCallback(async (uid: string) => {
    const { data } = await supabase.from("cart_items").select("*").eq("user_id", uid).order("added_at");
    const mapped: CartItem[] = (data ?? []).map((r: any) => ({
      id: r.product_id,
      slug: r.product_slug ?? r.product_id,
      title: r.title,
      price: Number(r.price),
      image: r.image,
      qty: r.qty,
      product_type: r.product_type,
      requires_info_file: !!r.requires_info_file,
      info_file_extension: r.info_file_extension ?? null,
    }));
    setItems(mapped);
  }, []);

  // Load: from DB if logged in, else from localStorage. Merge any local items into DB on login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (userId) {
        const local = readStorage();
        if (local.length > 0) {
          // FAIL-SAFE MERGE: only clear localStorage if upserts ALL succeed.
          try {
            const results = await Promise.all(
              local.map((it) =>
                supabase.from("cart_items").upsert({
                  user_id: userId,
                  product_id: it.id,
                  product_type: it.product_type,
                  product_slug: it.slug,
                  title: it.title,
                  price: it.price,
                  image: it.image,
                  qty: it.qty,
                  requires_info_file: !!it.requires_info_file,
                  info_file_extension: it.info_file_extension ?? null,
                }, { onConflict: "user_id,product_id,product_type" })
              )
            );
            const failed = results.find((r) => r.error);
            if (failed?.error) {
              console.error("Cart merge: at least one upsert failed", failed.error);
              // Retain local cart so the user doesn't lose items.
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch (err) {
            console.error("Cart merge failed; keeping local cart for retry", err);
          }
        }
        if (cancelled) return;
        await loadFromDb(userId);
      } else {
        setItems(readStorage());
      }
    })();
    const onUpdate = () => { if (!userId) setItems(readStorage()); };
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY && !userId) setItems(readStorage()); };
    window.addEventListener("shop_cart_updated", onUpdate);
    window.addEventListener("storage", onStorage);

    // Realtime cross-tab/device sync for authenticated users.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (userId) {
      channel = supabase
        .channel(`cart-items-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${userId}` },
          () => { void loadFromDb(userId); },
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("shop_cart_updated", onUpdate);
      window.removeEventListener("storage", onStorage);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, loadFromDb]);

  const persistLocal = useCallback((next: CartItem[]) => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("shop_cart_updated"));
  }, []);

  const add: CartContextValue["add"] = useCallback(async (item) => {
    const qty = item.qty ?? 1;
    if (userId) {
      const existing = items.find((i) => i.id === item.id);
      const newQty = (existing?.qty ?? 0) + qty;
      await supabase.from("cart_items").upsert({
        user_id: userId,
        product_id: item.id,
        product_type: item.product_type,
        product_slug: item.slug,
        title: item.title,
        price: item.price,
        image: item.image,
        qty: newQty,
        requires_info_file: !!item.requires_info_file,
        info_file_extension: item.info_file_extension ?? null,
      }, { onConflict: "user_id,product_id,product_type" });
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: newQty };
          return copy;
        }
        return [...prev, { ...item, qty }];
      });
    } else {
      const current = readStorage();
      const idx = current.findIndex((i) => i.id === item.id);
      if (idx >= 0) current[idx].qty += qty;
      else current.push({ ...item, qty });
      persistLocal(current);
    }
  }, [userId, items, persistLocal]);

  const remove = useCallback(async (id: string) => {
    if (userId) {
      await supabase.from("cart_items").delete().eq("user_id", userId).eq("product_id", id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      persistLocal(readStorage().filter((i) => i.id !== id));
    }
  }, [userId, persistLocal]);

  const setQty = useCallback(async (id: string, qty: number) => {
    if (qty <= 0) return remove(id);
    if (userId) {
      await supabase.from("cart_items").update({ qty }).eq("user_id", userId).eq("product_id", id);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
    } else {
      persistLocal(readStorage().map((i) => (i.id === id ? { ...i, qty } : i)));
    }
  }, [userId, remove, persistLocal]);

  const clear = useCallback(async () => {
    if (userId) {
      await supabase.from("cart_items").delete().eq("user_id", userId);
      setItems([]);
    } else {
      persistLocal([]);
    }
  }, [userId, persistLocal]);

  const applyCoupon = useCallback(async (code: string): Promise<{ ok: boolean; message: string }> => {
    const trimmed = (code ?? "").trim();
    if (!trimmed) return { ok: false, message: "יש להזין קוד" };
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const { data, error } = await (supabase as any)
      .from("shop_coupons")
      .select("id, code, discount_type, discount_value, min_order_amount, max_uses, current_uses, expires_at, starts_at, is_active")
      .ilike("code", trimmed)
      .maybeSingle();
    if (error || !data) { setCoupon(null); return { ok: false, message: "קוד לא נמצא" }; }
    if (!data.is_active) { setCoupon(null); return { ok: false, message: "הקוד אינו פעיל" }; }
    const now = Date.now();
    if (data.starts_at && new Date(data.starts_at).getTime() > now) { setCoupon(null); return { ok: false, message: "הקוד עוד לא פעיל" }; }
    if (data.expires_at && new Date(data.expires_at).getTime() < now) { setCoupon(null); return { ok: false, message: "הקוד פג תוקף" }; }
    if (data.max_uses != null && data.current_uses >= data.max_uses) { setCoupon(null); return { ok: false, message: "הקוד נוצל במלואו" }; }
    if (data.min_order_amount && subtotal < Number(data.min_order_amount)) {
      setCoupon(null);
      return { ok: false, message: `הזמנה מינימלית ₪${data.min_order_amount}` };
    }
    setCoupon({
      id: data.id,
      code: data.code,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value),
      min_order_amount: Number(data.min_order_amount ?? 0),
    });
    return { ok: true, message: "הקופון הופעל" };
  }, [items]);

  const removeCoupon = useCallback(() => setCoupon(null), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const vipDiscountAmount = Math.round((subtotal * vipDiscountPercent) / 100 * 100) / 100;
    const afterVip = Math.max(0, subtotal - vipDiscountAmount);
    let couponDiscountAmount = 0;
    if (coupon) {
      if (coupon.discount_type === "percent") {
        couponDiscountAmount = Math.round((afterVip * coupon.discount_value) / 100 * 100) / 100;
      } else {
        couponDiscountAmount = Math.min(afterVip, coupon.discount_value);
      }
    }
    const totalDiscount = vipDiscountAmount + couponDiscountAmount;
    const total = Math.max(0, subtotal - totalDiscount);
    return {
      items, count, subtotal,
      vipDiscountPercent, vipDiscountAmount,
      coupon, couponDiscountAmount, totalDiscount, total,
      applyCoupon, removeCoupon,
      add, remove, setQty, clear,
    };
  }, [items, vipDiscountPercent, coupon, applyCoupon, removeCoupon, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
