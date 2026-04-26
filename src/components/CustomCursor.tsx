import { useEffect, useRef, useState } from "react";

/**
 * Mix-blend custom cursor (desktop only).
 * - Center dot: difference blend → adapts to bg.
 * - Ring: spring-follow, expands on interactive elements.
 * - Auto-hidden on mobile / reduced-motion / inputs.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const tick = () => {
      // Spring follow for ring
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${
        active ? 0.85 : hovering ? 2 : 1
      })`;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("a, button, [role='button'], input, textarea, select, [data-cursor-hover]")) {
        if (!hovering) setHovering(true);
      } else if (hovering) {
        setHovering(false);
      }
    };
    const onDown = () => setActive(true);
    const onUp = () => setActive(false);
    const onLeave = () => { dot.style.opacity = "0"; ring.style.opacity = "0"; };
    const onEnter = () => { dot.style.opacity = "1"; ring.style.opacity = "0.6"; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(tick);

    document.documentElement.classList.add("cursor-none-strict");

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("cursor-none-strict");
    };
  }, [enabled, hovering, active]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: 8, height: 8,
          borderRadius: 999,
          background: "white",
          mixBlendMode: "difference",
          pointerEvents: "none",
          zIndex: 9999,
          transition: "opacity 0.2s",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: "fixed",
          top: 0, left: 0,
          width: 28, height: 28,
          borderRadius: 999,
          border: "1.5px solid oklch(0.78 0.13 215 / 0.7)",
          background: hovering
            ? "linear-gradient(135deg, oklch(0.78 0.13 215 / 0.15), oklch(0.62 0.22 340 / 0.15))"
            : "transparent",
          pointerEvents: "none",
          zIndex: 9998,
          opacity: 0.6,
          transition: "background 0.2s, opacity 0.2s, width 0.2s, height 0.2s",
        }}
      />
    </>
  );
}
