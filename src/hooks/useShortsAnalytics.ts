import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mux-style engagement tracker for the shorts feed.
 *
 * Per-video session state:
 *   - secondsWatched: cumulative real-time playback (excludes seeks back)
 *   - maxSecondsReached: furthest playhead position reached (= drop-off coord)
 *   - rewatchCount: number of backward seeks (user drags tracker back)
 *   - bufferedSeconds: cumulative stall time (QoE)
 *   - isCompleted: reached >= 95% of duration
 *
 * Flushes:
 *   - every FLUSH_INTERVAL_MS (2s) for the active video
 *   - immediately when the active video changes (swipe-away)
 *   - on page unload
 */
const FLUSH_INTERVAL_MS = 2000;

type Session = {
  sessionId: string;
  videoId: string;
  secondsWatched: number;
  maxSecondsReached: number;
  rewatchCount: number;
  bufferedSeconds: number;
  isCompleted: boolean;
  // local bookkeeping
  lastPlayheadTs: number; // performance.now() at last sample while playing
  lastVideoTime: number;
  lastFlushedSnapshot: string;
  waitingStartedAt: number | null;
};

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android|IEMobile/i.test(ua)) return "mobile";
  return "desktop";
}

function newSessionId(): string {
  // Lightweight unique id — no crypto.randomUUID polyfill needed for analytics
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useShortsAnalytics(opts: {
  videoId: string | null;
  videoEl: HTMLVideoElement | null;
  userId: string | null;
}) {
  const { videoId, videoEl, userId } = opts;
  const sessionRef = useRef<Session | null>(null);
  const deviceRef = useRef<string>(detectDevice());

  // Flush current session to Supabase
  const flush = async (final: boolean) => {
    const s = sessionRef.current;
    if (!s) return;
    const snapshot = JSON.stringify([
      Math.round(s.secondsWatched),
      Math.round(s.maxSecondsReached),
      s.rewatchCount,
      Math.round(s.bufferedSeconds),
      s.isCompleted,
    ]);
    if (!final && snapshot === s.lastFlushedSnapshot) return;
    s.lastFlushedSnapshot = snapshot;
    try {
      await supabase.from("shorts_analytics_logs").insert({
        session_id: s.sessionId,
        video_id: s.videoId,
        user_id: userId ?? null,
        seconds_watched: Math.round(s.secondsWatched),
        max_seconds_reached: Math.round(s.maxSecondsReached * 10) / 10,
        rewatch_count: s.rewatchCount,
        buffered_seconds: Math.round(s.bufferedSeconds * 10) / 10,
        is_completed: s.isCompleted,
        device_type: deviceRef.current,
      });
    } catch {
      /* analytics never blocks UX */
    }
  };

  // Reset session whenever the active video changes; flush the prior one.
  useEffect(() => {
    // Swipe-away flush of previous session
    void flush(true);
    if (!videoId) {
      sessionRef.current = null;
      return;
    }
    sessionRef.current = {
      sessionId: newSessionId(),
      videoId,
      secondsWatched: 0,
      maxSecondsReached: 0,
      rewatchCount: 0,
      bufferedSeconds: 0,
      isCompleted: false,
      lastPlayheadTs: 0,
      lastVideoTime: 0,
      lastFlushedSnapshot: "",
      waitingStartedAt: null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Wire up the <video> element listeners + 2s flush interval.
  useEffect(() => {
    if (!videoEl || !videoId) return;
    const s = sessionRef.current;
    if (!s) return;

    const onPlay = () => {
      s.lastPlayheadTs = performance.now();
      s.lastVideoTime = videoEl.currentTime;
    };
    const onPause = () => {
      s.lastPlayheadTs = 0;
    };
    const onTimeUpdate = () => {
      const now = performance.now();
      const cur = videoEl.currentTime;
      if (s.lastPlayheadTs > 0) {
        const dtReal = (now - s.lastPlayheadTs) / 1000;
        const dtVideo = cur - s.lastVideoTime;
        // Forward natural playback → watched time
        if (dtVideo > 0 && dtVideo < dtReal * 2) {
          s.secondsWatched += dtVideo;
        } else if (dtVideo < -0.5) {
          // Backward seek → rewatch tick
          s.rewatchCount += 1;
        }
      }
      if (cur > s.maxSecondsReached) s.maxSecondsReached = cur;
      s.lastPlayheadTs = now;
      s.lastVideoTime = cur;
    };
    const onWaiting = () => {
      s.waitingStartedAt = performance.now();
    };
    const onPlaying = () => {
      if (s.waitingStartedAt != null) {
        s.bufferedSeconds += (performance.now() - s.waitingStartedAt) / 1000;
        s.waitingStartedAt = null;
      }
    };
    const onEnded = () => {
      s.isCompleted = true;
      void flush(true);
    };

    videoEl.addEventListener("play", onPlay);
    videoEl.addEventListener("pause", onPause);
    videoEl.addEventListener("timeupdate", onTimeUpdate);
    videoEl.addEventListener("waiting", onWaiting);
    videoEl.addEventListener("playing", onPlaying);
    videoEl.addEventListener("ended", onEnded);

    const interval = window.setInterval(() => {
      if (videoEl.duration && s.maxSecondsReached >= videoEl.duration * 0.95) {
        s.isCompleted = true;
      }
      void flush(false);
    }, FLUSH_INTERVAL_MS);

    const onUnload = () => void flush(true);
    window.addEventListener("pagehide", onUnload);

    return () => {
      window.clearInterval(interval);
      videoEl.removeEventListener("play", onPlay);
      videoEl.removeEventListener("pause", onPause);
      videoEl.removeEventListener("timeupdate", onTimeUpdate);
      videoEl.removeEventListener("waiting", onWaiting);
      videoEl.removeEventListener("playing", onPlaying);
      videoEl.removeEventListener("ended", onEnded);
      window.removeEventListener("pagehide", onUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoEl, videoId]);
}
