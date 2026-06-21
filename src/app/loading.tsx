export default function Loading() {
  return (
    <div className="divide-y divide-border" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-3 px-4 py-4 sm:px-5">
          <div className="h-10 w-10 shrink-0 rounded-full bg-elevated" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-40 rounded bg-elevated" />
            <div className="h-3 w-full rounded bg-elevated" />
            <div className="h-3 w-4/5 rounded bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}
