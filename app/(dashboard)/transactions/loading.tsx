import { TransactionListSkeleton } from "@/components/shared/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-[#e2e2e5] rounded animate-pulse" />
        <div className="h-10 w-36 bg-[#e2e2e5] rounded animate-pulse" />
      </div>
      <TransactionListSkeleton />
    </div>
  );
}
