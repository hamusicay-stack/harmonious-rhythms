import { createContext, useContext, useState, type ReactNode } from "react";

export type SelectedModel = {
  id: string;
  brand_id: string;
  model_name: string;
  ui_image_url: string | null;
  brand?: { id: string; name: string; logo_url: string | null } | null;
};

type Ctx = {
  selectedModel: SelectedModel | null;
  setSelectedModel: (m: SelectedModel | null) => void;
};

const SmartRhythmsContext = createContext<Ctx | null>(null);

export function SmartRhythmsProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  return (
    <SmartRhythmsContext.Provider value={{ selectedModel, setSelectedModel }}>
      {children}
    </SmartRhythmsContext.Provider>
  );
}

export function useSmartRhythms() {
  const ctx = useContext(SmartRhythmsContext);
  if (!ctx) throw new Error("useSmartRhythms must be used within SmartRhythmsProvider");
  return ctx;
}
