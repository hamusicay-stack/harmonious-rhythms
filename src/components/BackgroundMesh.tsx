import { useEffect, useRef } from "react";

/**
 * Dynamic Mesh Gradient background (z0).
 * - Tracks mouse via CSS vars --mesh-x / --mesh-y on <html>.
 * - Throttled with rAF.
 * - Disabled on mobile + reduced-motion (CSS handles fallback).
 */
export function BackgroundMesh() {
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 768px)").matches) return;

    const apply = () => {
      const p = pendingRef.current;
      rafRef.current = null;
      if (!p) return;
      const root = document.documentElement;
      root.style.setProperty("--mesh-x", `${p.x}%`);
      root.style.setProperty("--mesh-y", `${p.y}%`);
    };

    const onMove = (e: MouseEvent) => {
      pendingRef.current = {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      };
      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(apply);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div className="background-pattern" aria-hidden />
      <div className="background-mesh animate-mesh-float" aria-hidden />
    </>
  );
}
