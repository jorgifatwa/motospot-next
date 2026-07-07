import { DashboardKPISkeleton } from "@/components/shared/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-[#e2e2e5] rounded animate-pulse" />
      <DashboardKPISkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#f7f7f8] border border-[#e2e2e5] rounded-lg p-6 space-y-4">
          <div className="h-5 w-32 bg-[#e2e2e5] rounded animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#e2e2e5] rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="bg-[#f7f7f8] border border-[#e2e2e5] rounded-lg p-6 space-y-4">
          <div className="h-5 w-32 bg-[#e2e2e5] rounded animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#e2e2e5] rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
