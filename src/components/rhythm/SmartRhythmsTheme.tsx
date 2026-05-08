import { forwardRef, type HTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Smart Rhythms — Pro Studio Hardware Theme
 * Wrap any subtree with <SmartRhythmsTheme> to scope the dark, tactile,
 * arranger-keyboard look. RTL-safe by default (inherits page direction).
 */
export const SmartRhythmsTheme = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("smart-rhythms", className)} {...props} />
  ),
);
SmartRhythmsTheme.displayName = "SmartRhythmsTheme";

export type LedColor = "blue" | "amber" | "green" | "red" | "magenta";

interface SrKeyProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  lit?: boolean;
  pulse?: boolean;
  led?: LedColor;
  pad?: boolean;
  ledDot?: boolean;
}

export const SrKey = forwardRef<HTMLButtonElement, SrKeyProps>(
  ({ className, lit, pulse, led = "blue", pad, ledDot, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      data-lit={lit ? "true" : undefined}
      className={cn(
        "sr-key",
        `sr-led-${led}`,
        pulse && "sr-pulse",
        pad && "sr-pad",
        className,
      )}
      {...props}
    >
      {ledDot && <span className="sr-led-dot" aria-hidden />}
      {children}
    </button>
  ),
);
SrKey.displayName = "SrKey";

export function SrPanel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("sr-panel p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function SrReadout({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("sr-readout", className)}>{children}</div>;
}

export function SrLabel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("sr-label", className)}>{children}</div>;
}

export function SrChip({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("sr-chip", className)}>{children}</span>;
}

export function SrMeter({ value = 0, segments = 12, className }: { value?: number; segments?: number; className?: string }) {
  const lit = Math.round((Math.min(1, Math.max(0, value)) * segments));
  return (
    <div className={cn("sr-meter", className)}>
      {Array.from({ length: segments }).map((_, i) => {
        const on = i < lit;
        const warn = i >= segments * 0.7 && i < segments * 0.9;
        const peak = i >= segments * 0.9;
        return (
          <i key={i}
            data-on={on ? "true" : undefined}
            data-warn={warn ? "true" : undefined}
            data-peak={peak ? "true" : undefined}
          />
        );
      })}
    </div>
  );
}

export function SrKnob({ value = 0, led = "blue", className }: { value?: number; led?: LedColor; className?: string }) {
  const angle = -135 + Math.min(1, Math.max(0, value)) * 270;
  return (
    <div
      className={cn("sr-knob", `sr-led-${led}`, className)}
      style={{ transform: `rotate(${angle}deg)` }}
      role="slider"
      aria-valuenow={Math.round(value * 100)}
    >
      <span className="sr-knob-tick" />
    </div>
  );
}
