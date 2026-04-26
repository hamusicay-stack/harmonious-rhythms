import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

interface Options {
  onCommandPalette?: () => void;
  onShowHelp?: () => void;
  onSearch?: () => void;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Global keyboard shortcuts.
 * - Cmd/Ctrl+K → command palette
 * - / → focus search
 * - ? → help
 * - G then H/A/S/F → navigate (Home/Academy/Shop/Forum)
 */
export function useKeyboardShortcuts({ onCommandPalette, onShowHelp, onSearch }: Options) {
  const navigate = useNavigate();

  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K — always works (even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onCommandPalette?.();
        return;
      }

      if (isTyping(e.target)) return;

      if (e.key === "/") {
        e.preventDefault();
        onSearch?.();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        onShowHelp?.();
        return;
      }

      // G prefix navigation
      if (gPressed) {
        const map: Record<string, string> = {
          h: "/", a: "/academy", s: "/shop", f: "/forum",
          m: "/marketplace", p: "/pros", v: "/shorts",
        };
        const dest = map[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          navigate({ to: dest });
        }
        gPressed = false;
        if (gTimer) clearTimeout(gTimer);
        return;
      }
      if (e.key.toLowerCase() === "g") {
        gPressed = true;
        gTimer = setTimeout(() => { gPressed = false; }, 1200);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [navigate, onCommandPalette, onShowHelp, onSearch]);
}
