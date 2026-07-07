import { MotorcycleGridSkeleton } from "@/components/shared/skeleton";

export default function MotorcyclesLoading() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-7 w-32 bg-[#e2e2e5] rounded animate-pulse" />
        <div className="h-10 w-36 bg-[#e2e2e5] rounded animate-pulse" />
      </div>
      <div className="bg-[#f7f7f8] border border-[#e2e2e5] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-[#e2e2e5] rounded animate-pulse" />
          ))}
        </div>
      </div>
      <MotorcycleGridSkeleton />
    </div>
  );
}
