import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "admin_impersonation";

export type ImpersonatedUser = {
  id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
};

type Ctx = {
  impersonated: ImpersonatedUser | null;
  startImpersonation: (u: ImpersonatedUser) => void;
  stopImpersonation: () => void;
};

const ImpersonationContext = createContext<Ctx | null>(null);

function read(): ImpersonatedUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImpersonatedUser) : null;
  } catch {
    return null;
  }
}

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [impersonated, setImpersonated] = useState<ImpersonatedUser | null>(null);

  useEffect(() => {
    setImpersonated(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setImpersonated(read());
    };
    const onCustom = () => setImpersonated(read());
    window.addEventListener("storage", onStorage);
    window.addEventListener("impersonation_updated", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("impersonation_updated", onCustom);
    };
  }, []);

  const startImpersonation = useCallback((u: ImpersonatedUser) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    window.dispatchEvent(new Event("impersonation_updated"));
    setImpersonated(u);
  }, []);

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("impersonation_updated"));
    setImpersonated(null);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ impersonated, startImpersonation, stopImpersonation }),
    [impersonated, startImpersonation, stopImpersonation],
  );

  return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
}
