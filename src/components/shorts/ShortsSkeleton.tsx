export function ShortsSkeleton({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={fullScreen ? "fixed inset-0 z-50 bg-black" : "relative w-full"}>
      <div className="absolute left-0 right-0 top-0 z-10 flex gap-3 overflow-hidden bg-gradient-to-b from-black/70 to-transparent p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-white/10" />
        ))}
      </div>
      <div className={fullScreen ? "h-full w-full animate-pulse bg-gradient-to-b from-white/5 via-white/10 to-white/5" : "mx-auto aspect-[9/16] w-full max-w-[420px] animate-pulse rounded-2xl bg-gradient-to-b from-white/5 via-white/10 to-white/5"} />
      <div className="absolute bottom-6 left-4 right-20 space-y-2">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-white/15" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="absolute bottom-20 right-3 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-12 animate-pulse rounded-full bg-white/15" />
        ))}
      </div>
    </div>
  );
}
