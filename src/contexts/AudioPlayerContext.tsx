import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type AudioTrack = {
  id: string;
  url: string;
  title: string;
  artist: string;
  proId?: string;
};

type AudioPlayerContextValue = {
  current: AudioTrack | null;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (track: AudioTrack) => void;
  toggle: () => void;
  stop: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback((track: AudioTrack) => {
    setCurrent(track);
    setIsPlaying(true);
    // src change handled by FloatingAudioPlayer effect
    setTimeout(() => {
      audioRef.current?.play().catch(() => setIsPlaying(false));
    }, 50);
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
  }, []);

  const value = useMemo(
    () => ({ current, isPlaying, audioRef, play, toggle, stop }),
    [current, isPlaying, play, toggle, stop],
  );

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
