import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type FloatingShort = {
  id: string;
  videoUrl: string;
  poster: string | null;
  title: string;
  creatorName: string;
  startAt: number;     // seconds — where to resume
  muted: boolean;
};

type Ctx = {
  short: FloatingShort | null;
  detach: (s: FloatingShort) => void;
  dismiss: () => void;
  updateTime: (id: string, t: number) => void;
};

const FloatingShortContext = createContext<Ctx | null>(null);

export function FloatingShortProvider({ children }: { children: ReactNode }) {
  const [short, setShort] = useState<FloatingShort | null>(null);

  const detach = useCallback((s: FloatingShort) => setShort(s), []);
  const dismiss = useCallback(() => setShort(null), []);
  const updateTime = useCallback((id: string, t: number) => {
    setShort((cur) => (cur && cur.id === id ? { ...cur, startAt: t } : cur));
  }, []);

  const value = useMemo<Ctx>(() => ({ short, detach, dismiss, updateTime }), [short, detach, dismiss, updateTime]);
  return <FloatingShortContext.Provider value={value}>{children}</FloatingShortContext.Provider>;
}

export function useFloatingShort() {
  const ctx = useContext(FloatingShortContext);
  if (!ctx) throw new Error("useFloatingShort must be used within FloatingShortProvider");
  return ctx;
}
