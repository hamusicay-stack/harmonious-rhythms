import { useRef, ReactNode, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  level?: "z1" | "z2" | "z3";
  interactive?: boolean;
  parallax?: boolean;
  noise?: boolean;
  onClick?: () => void;
  as?: "div" | "article" | "section";
}

/**
 * GlassCard — Sonic Glass v5 surface
 * - 4-layer Z-Axis (z1/z2/z3)
 * - Subtle 4px content parallax (capped to prevent motion sickness)
 * - Optional border light sweep + noise overlay
 */
export function GlassCard({
  children,
  className,
  level = "z2",
  interactive = false,
  parallax = false,
  noise = true,
  onClick,
  as: Tag = "div",
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!parallax || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5..0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      // capped at 4px translation (manifesto: prevent motion sickness)
      ref.current?.style.setProperty("--px", `${px * 4}px`);
      ref.current?.style.setProperty("--py", `${py * 4}px`);
    });
  };

  const handleLeave = () => {
    if (!parallax || !ref.current) return;
    ref.current.style.setProperty("--px", "0px");
    ref.current.style.setProperty("--py", "0px");
  };

  return (
    <Tag
      ref={ref as never}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "relative rounded-3xl overflow-hidden",
        level === "z1" && "glass-z1",
        level === "z2" && "glass-z2",
        level === "z3" && "glass-z3",
        interactive && "glass-card-interactive cursor-pointer",
        noise && "glass-noise",
        className,
      )}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: parallax ? "translate3d(var(--px,0px), var(--py,0px), 0)" : undefined,
          transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {children}
      </div>
    </Tag>
  );
}
