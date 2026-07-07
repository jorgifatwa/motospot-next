"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelTransaction } from "@/modules/transaction/transaction.actions";

interface TransactionItem {
  id: string;
  motorcycle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    category: { name: string };
  };
}

interface Transaction {
  id: string;
  transactionNumber: string;
  status: "SALE" | "BOOKING" | "CANCELLED";
  createdAt: Date;
  customer: { name: string };
  branch: { name: string };
  items: TransactionItem[];
}

interface Branch {
  id: string;
  name: string;
}

interface Props {
  transactions: Transaction[];
  branches: Branch[];
  userBranchId?: string;
  isAdmin: boolean;
}

export function TransactionsClient({ transactions }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this transaction? This restores all motorcycles to AVAILABLE.")) return;
    setLoadingId(id);
    setError("");
    try {
      await cancelTransaction(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setLoadingId(null);
    }
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      SALE: "bg-status-sold text-white",
      BOOKING: "bg-status-booked text-white",
      CANCELLED: "bg-status-cancelled text-white",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[s] || "bg-gray-100"}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Transactions</h2>
        <button
          onClick={() => router.push("/dashboard/transactions/new")}
          className="px-4 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark"
        >
          New Transaction
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-12 text-text-muted">No transactions found</div>
      ) : (
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-bold font-tabular-nums">{t.transactionNumber}</p>
                  <p className="text-sm text-text-muted">
                    {t.customer.name} · {t.branch.name} ·{" "}
                    {new Date(t.createdAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(t.status)}
                  {t.status !== "CANCELLED" && (
                    <button
                      onClick={() => handleCancel(t.id)}
                      disabled={loadingId === t.id}
                      className="px-3 py-1 border border-border rounded-md text-sm hover:bg-bg disabled:opacity-50"
                    >
                      {loadingId === t.id ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.items.map((item) => (
                  <span
                    key={item.id}
                    className="text-xs bg-bg border border-border rounded px-2 py-1"
                  >
                    {item.motorcycle.brand.name} {item.motorcycle.category.name} ·{" "}
                    {item.motorcycle.licensePlate}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
