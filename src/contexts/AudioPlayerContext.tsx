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

  const play = useCallback((track: AudioTrack) => {
    setQueue([track]);
    setCurrentIndex(0);
    setCurrent(track);
    setIsPlaying(true);
    // src change handled by FloatingAudioPlayer effect
    setTimeout(() => {
      audioRef.current?.play().catch(() => setIsPlaying(false));
    }, 50);
  }, []);

  const playQueue = useCallback((tracks: AudioTrack[], startId?: string) => {
    if (tracks.length === 0) return;
    const index = Math.max(0, startId ? tracks.findIndex((track) => track.id === startId) : 0);
    setQueue(tracks);
    setCurrentIndex(index);
    setCurrent(tracks[index]);
    setIsPlaying(true);
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

  const value = useMemo(
    () => ({
      current,
      isPlaying,
      audioRef,
      play,
      playQueue,
      toggle,
      stop,
      next,
      previous,
      hasNext: currentIndex < queue.length - 1,
      hasPrevious: currentIndex > 0,
    }),
    [current, currentIndex, isPlaying, next, play, playQueue, previous, queue.length, stop, toggle],
  );

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}
