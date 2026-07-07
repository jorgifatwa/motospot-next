import { TableSkeleton } from "@/components/shared/skeleton";

export default function BranchesLoading() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-7 w-32 bg-[#e2e2e5] rounded animate-pulse" />
        <div className="h-10 w-28 bg-[#e2e2e5] rounded animate-pulse" />
      </div>
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}
