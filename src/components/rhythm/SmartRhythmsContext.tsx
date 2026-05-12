import type { ReactNode } from "react";
import {
  useKeyboardSelection,
  type SelectedModel,
} from "@/contexts/KeyboardSelectionContext";

export type { SelectedModel };

/**
 * Legacy alias — selection state now lives in the root-level
 * KeyboardSelectionProvider (mounted in __root.tsx). This provider is a
 * no-op passthrough kept for backward compatibility.
 */
export function SmartRhythmsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useSmartRhythms() {
  return useKeyboardSelection();
}
