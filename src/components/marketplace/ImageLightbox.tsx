import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  images: string[];
  open: boolean;
  initialIndex?: number;
  onOpenChange: (open: boolean) => void;
  alt?: string;
}

export function ImageLightbox({ images, open, initialIndex = 0, onOpenChange, alt = "" }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { if (open) setIndex(initialIndex); }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      if (e.key === "ArrowRight") setIndex((i) => (i - 1 + images.length) % images.length); // RTL
      if (e.key === "ArrowLeft") setIndex((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length, onOpenChange]);

  if (images.length === 0) return null;

  const next = () => setIndex((i) => (i + 1) % images.length);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-screen h-screen p-0 bg-black/95 border-0 sm:rounded-none flex flex-col">
        <button onClick={() => onOpenChange(false)} className="absolute top-4 start-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white">
          <X className="h-5 w-5" />
        </button>
        <div className="absolute top-4 end-4 z-50 bg-white/10 text-white rounded-full px-3 py-1 text-sm">
          {index + 1} / {images.length}
        </div>

        <div
          className="flex-1 flex items-center justify-center relative overflow-hidden"
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
            touchStartX.current = null;
          }}
        >
          <img
            src={images[index]}
            alt={alt}
            className="max-w-full max-h-full object-contain select-none"
            onClick={() => onOpenChange(false)}
          />
          {images.length > 1 && (
            <>
              <button onClick={prev} className="absolute end-2 sm:end-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white">
                <ChevronRight className="h-6 w-6" />
              </button>
              <button onClick={next} className="absolute start-2 sm:start-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white">
                <ChevronLeft className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="bg-black/60 p-2 overflow-x-auto">
            <div className="flex gap-2 justify-center min-w-min">
              {images.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setIndex(i)}
                  className={`shrink-0 h-16 w-16 rounded overflow-hidden border-2 transition ${i === index ? "border-primary opacity-100" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
