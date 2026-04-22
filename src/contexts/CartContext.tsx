import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    setItems(readStorage());
    const onUpdate = () => setItems(readStorage());
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setItems(readStorage()); };
    window.addEventListener("shop_cart_updated", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("shop_cart_updated", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("shop_cart_updated"));
  }, []);

  const add: CartContextValue["add"] = useCallback((item) => {
    const qty = item.qty ?? 1;
    const current = readStorage();
    const idx = current.findIndex((i) => i.id === item.id);
    if (idx >= 0) current[idx].qty += qty;
    else current.push({ ...item, qty });
    persist(current);
  }, [persist]);

  const remove = useCallback((id: string) => {
    persist(readStorage().filter((i) => i.id !== id));
  }, [persist]);

  const setQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) return remove(id);
    persist(readStorage().map((i) => (i.id === id ? { ...i, qty } : i)));
  }, [persist, remove]);

  const clear = useCallback(() => persist([]), [persist]);

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
