import { useCallback, useRef } from "react";

/**
 * useUISounds — synthesized spatial UI sounds (no audio assets needed)
 * - Volume capped 0.08–0.15 (subtle, non-disruptive)
 * - Velocity-aware: faster interactions = brighter/louder
 * - Spatial: pans based on screen X (StereoPannerNode)
 */
type SoundKind = "tick" | "select" | "click" | "toast" | "open";

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function useUISounds() {
  const lastTime = useRef<number>(0);

  const play = useCallback((kind: SoundKind, opts?: { x?: number; velocity?: number }) => {
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});

    const now = c.currentTime;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1;
    const pan = opts?.x !== undefined ? Math.max(-1, Math.min(1, (opts.x / vw) * 2 - 1)) : 0;
    const velocity = Math.max(0, Math.min(1, opts?.velocity ?? 0.5));

    const baseVol = 0.08 + velocity * 0.07; // 0.08..0.15
    const cfg: Record<SoundKind, { freq: number; type: OscillatorType; dur: number }> = {
      tick:   { freq: 3000, type: "square",   dur: 0.04 },
      select: { freq: 520,  type: "sine",     dur: 0.18 },
      click:  { freq: 1800, type: "triangle", dur: 0.06 },
      toast:  { freq: 880,  type: "sine",     dur: 0.22 },
      open:   { freq: 660,  type: "sine",     dur: 0.28 },
    };
    const { freq, type, dur } = cfg[kind];

    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * (1 + velocity * 0.15);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(baseVol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    let lastNode: AudioNode = gain;
    if (typeof c.createStereoPanner === "function") {
      const panner = c.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      lastNode = panner;
    }

    osc.connect(gain);
    lastNode.connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
    lastTime.current = Date.now();
  }, []);

  return { play };
}
