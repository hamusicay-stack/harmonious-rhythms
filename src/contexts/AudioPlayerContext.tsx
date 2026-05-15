import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type AudioTrack = {
  id: string;
  url: string;
  title: string;
  artist: string;
  proId?: string;
  loop?: boolean;
};

type AudioPlayerContextValue = {
  current: AudioTrack | null;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (track: AudioTrack) => void;
  playQueue: (tracks: AudioTrack[], startId?: string) => void;
  toggle: () => void;
  stop: () => void;
  stopGlobal: () => void;
  next: () => void;
  previous: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<AudioTrack | null>(null);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Playback (.play()) is triggered by FloatingAudioPlayer once the
  // <audio> element fires `canplay` — this avoids the classic race where
  // .play() is called before the new src has buffered, leading to
  // AbortError or silent failures (Virtual Organ button switching).
  const play = useCallback((track: AudioTrack) => {
    setQueue([track]);
    setCurrentIndex(0);
    setCurrent(track);
    setIsPlaying(true);
  }, []);

  const playQueue = useCallback((tracks: AudioTrack[], startId?: string) => {
    if (tracks.length === 0) return;
    const index = Math.max(0, startId ? tracks.findIndex((track) => track.id === startId) : 0);
    setQueue(tracks);
    setCurrentIndex(index);
    setCurrent(tracks[index]);
    setIsPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) {
      a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, [current]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrent(null);
    setQueue([]);
    setCurrentIndex(0);
  }, []);

  const next = useCallback(() => {
    setQueue((tracks) => {
      setCurrentIndex((index) => {
        const nextIndex = index + 1;
        if (nextIndex >= tracks.length) {
          audioRef.current?.pause();
          setCurrent(null);
          setIsPlaying(false);
          return index;
        }
        setCurrent(tracks[nextIndex]);
        setIsPlaying(true);
        setTimeout(() => audioRef.current?.play().catch(() => setIsPlaying(false)), 50);
        return nextIndex;
      });
      return tracks;
    });
  }, []);

  const previous = useCallback(() => {
    setQueue((tracks) => {
      setCurrentIndex((index) => {
        const prevIndex = Math.max(0, index - 1);
        setCurrent(tracks[prevIndex] ?? null);
        setIsPlaying(true);
        setTimeout(() => audioRef.current?.play().catch(() => setIsPlaying(false)), 50);
        return prevIndex;
      });
      return tracks;
    });
  }, []);

  // Global Audio Collision Manager:
  // - When ANY native <video>/<audio> begins playing, stop our context track
  //   and broadcast app:stop-all-audio so Virtual Organ / Web Audio loops mute.
  // - When our context track plays (playGlobal), pause all other native media.
  const stopGlobal = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:stop-all-audio"));
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onPlay = (e: Event) => {
      const target = e.target as HTMLMediaElement | null;
      if (!target || (target.tagName !== "VIDEO" && target.tagName !== "AUDIO")) return;
      if (target === audioRef.current) {
        // Our context's track started → pause every OTHER native media element.
        document.querySelectorAll<HTMLMediaElement>("video, audio").forEach((el) => {
          if (el !== audioRef.current && !el.paused) el.pause();
        });
        // And mute Web Audio loops (Virtual Organ etc).
        window.dispatchEvent(new CustomEvent("app:stop-web-audio"));
      } else {
        // Another media element started → stop our context + Web Audio.
        if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
        setIsPlaying(false);
        // Pause every OTHER native media too (one-at-a-time policy).
        document.querySelectorAll<HTMLMediaElement>("video, audio").forEach((el) => {
          if (el !== target && el !== audioRef.current && !el.paused) el.pause();
        });
        window.dispatchEvent(new CustomEvent("app:stop-web-audio"));
      }
    };
    document.addEventListener("play", onPlay, true);
    return () => document.removeEventListener("play", onPlay, true);
  }, []);

  const value = useMemo(
    () => ({
      current,
      isPlaying,
      audioRef,
      play,
      playQueue,
      toggle,
      stop,
      stopGlobal,
      next,
      previous,
      hasNext: currentIndex < queue.length - 1,
      hasPrevious: currentIndex > 0,
    }),
    [current, currentIndex, isPlaying, next, play, playQueue, previous, queue.length, stop, stopGlobal, toggle],
  );

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
