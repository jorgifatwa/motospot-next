// ────────────────────────────────
// Shared Skeleton Components
// UI_GUIDELINE.md Section 7 — loading states for all list/table pages
// ────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[#e2e2e5] rounded ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#f7f7f8] border border-[#e2e2e5] rounded-lg overflow-hidden">
      {/* Image area */}
      <Skeleton className="aspect-video w-full !rounded-none" />
      {/* Content */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-[#f7f7f8] border border-[#e2e2e5] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[#1a1a1a] px-6 py-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-3/4 !bg-[#3d3d3d]" />
          ))}
        </div>
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="px-6 py-4 border-b border-[#e2e2e5]"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, col) => (
              <Skeleton key={col} className={`h-4 ${col === 0 ? "w-3/4" : "w-1/2"}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MotorcycleGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TransactionListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-[#f7f7f8] border border-[#e2e2e5] rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardKPISkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#f7f7f8] border border-[#e2e2e5] rounded-lg p-6 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
