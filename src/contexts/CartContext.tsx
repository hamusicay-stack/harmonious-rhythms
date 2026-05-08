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
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
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

  // Track logged-in user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUserId(sess?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load: from DB if logged in, else from localStorage. Merge any local items into DB on login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (userId) {
        const local = readStorage();
        if (local.length > 0) {
          // Merge local into DB
          await Promise.all(local.map((it) =>
            supabase.from("cart_items").upsert({
              user_id: userId,
              product_id: it.id,
              product_type: it.product_type,
              product_slug: it.slug,
              title: it.title,
              price: it.price,
              image: it.image,
              qty: it.qty,
            }, { onConflict: "user_id,product_id,product_type" })
          ));
          localStorage.removeItem(STORAGE_KEY);
        }
        const { data } = await supabase.from("cart_items").select("*").eq("user_id", userId).order("added_at");
        if (cancelled) return;
        const mapped: CartItem[] = (data ?? []).map((r: any) => ({
          id: r.product_id,
          slug: r.product_slug ?? r.product_id,
          title: r.title,
          price: Number(r.price),
          image: r.image,
          qty: r.qty,
          product_type: r.product_type,
        }));
        setItems(mapped);
      } else {
        setItems(readStorage());
      }
    })();
    const onUpdate = () => { if (!userId) setItems(readStorage()); };
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY && !userId) setItems(readStorage()); };
    window.addEventListener("shop_cart_updated", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("shop_cart_updated", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

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

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { items, count, subtotal, add, remove, setQty, clear };
  }, [items, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
