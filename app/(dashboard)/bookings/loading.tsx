import { TransactionListSkeleton } from "@/components/shared/skeleton";

export default function BookingsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-[#e2e2e5] rounded animate-pulse" />
      </div>
      <TransactionListSkeleton />
    </div>
  );
}
