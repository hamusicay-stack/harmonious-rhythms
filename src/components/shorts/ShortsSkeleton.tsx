export function ShortsSkeleton({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={fullScreen ? "fixed inset-0 z-50 bg-black" : "relative w-full"}>
      <div className="absolute start-0 end-0 top-0 z-10 flex gap-3 overflow-hidden bg-gradient-to-b from-black/70 to-transparent p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-14 w-14 shrink-0 rounded-full" />
        ))}
      </div>
      <div className={fullScreen ? "shimmer h-full w-full" : "shimmer mx-auto aspect-[9/16] w-full max-w-[420px] rounded-2xl"} />
      <div className="absolute bottom-6 start-4 end-20 space-y-2">
        <div className="shimmer h-3 w-1/3 rounded-full" />
        <div className="shimmer h-3 w-2/3 rounded-full" />
      </div>
      <div className="absolute bottom-20 end-3 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-12 w-12 rounded-full" />
        ))}
      </div>
    </div>
  );
}
