import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type SelectedModel = {
  id: string;
  brand_id: string;
  model_name: string;
  ui_image_url: string | null;
  brand?: { id: string; name: string; logo_url: string | null } | null;
};

const LS_KEY = "beat:selectedModelId";

type Ctx = {
  selectedModel: SelectedModel | null;
  setSelectedModel: (m: SelectedModel | null) => void;
};

const KeyboardSelectionContext = createContext<Ctx | null>(null);

async function fetchModel(modelId: string): Promise<SelectedModel | null> {
  const { data } = await supabase
    .from("keyboard_models" as any)
    .select("*, brand:brands(*)")
    .eq("id", modelId)
    .maybeSingle();
  return (data as any) ?? null;
}

export function KeyboardSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModelState] = useState<SelectedModel | null>(null);
  const location = useLocation();
  const hydrated = useRef(false);

  // Hydrate once: URL ?model= takes precedence over localStorage
  useEffect(() => {
    if (typeof window === "undefined" || hydrated.current) return;
    hydrated.current = true;
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("model");
    const fromLs = localStorage.getItem(LS_KEY);
    const modelId = fromUrl || fromLs;
    if (!modelId) return;
    (async () => {
      const m = await fetchModel(modelId);
      if (m) {
        setSelectedModelState(m);
        localStorage.setItem(LS_KEY, m.id);
      } else {
        localStorage.removeItem(LS_KEY);
      }
    })();
  }, []);

  const setSelectedModel = (m: SelectedModel | null) => {
    setSelectedModelState(m);
    if (typeof window === "undefined") return;
    if (m) localStorage.setItem(LS_KEY, m.id);
    else localStorage.removeItem(LS_KEY);
  };

  const syncsUrl = (path: string) => path.startsWith("/beat") || path.startsWith("/organ");

  // Keep URL ?model= in sync on /beat and /organ routes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!syncsUrl(location.pathname)) return;
    const url = new URL(window.location.href);
    const current = url.searchParams.get("model");
    const target = selectedModel?.id ?? null;
    if (current === target) return;
    if (target) url.searchParams.set("model", target);
    else url.searchParams.delete("model");
    window.history.replaceState({}, "", url.toString());
  }, [selectedModel, location.pathname]);

  // Reflect external URL changes (navigation with ?model=)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!syncsUrl(location.pathname)) return;
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("model");
    if (!fromUrl || fromUrl === selectedModel?.id) return;
    (async () => {
      const m = await fetchModel(fromUrl);
      if (m) {
        setSelectedModelState(m);
        localStorage.setItem(LS_KEY, m.id);
      }
    })();
  }, [location.pathname]);

  // Cross-tab sync: react to localStorage changes from other tabs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_KEY) return;
      const newId = e.newValue;
      if (!newId) {
        setSelectedModelState(null);
        return;
      }
      if (newId === selectedModel?.id) return;
      (async () => {
        const m = await fetchModel(newId);
        if (m) setSelectedModelState(m);
      })();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [selectedModel?.id]);

  return (
    <KeyboardSelectionContext.Provider value={{ selectedModel, setSelectedModel }}>
      {children}
    </KeyboardSelectionContext.Provider>
  );
}

export function useKeyboardSelection() {
  const ctx = useContext(KeyboardSelectionContext);
  if (!ctx) throw new Error("useKeyboardSelection must be used within KeyboardSelectionProvider");
  return ctx;
}
