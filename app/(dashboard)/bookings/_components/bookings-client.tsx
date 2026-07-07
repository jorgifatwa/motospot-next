"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertBooking, cancelBooking } from "@/modules/booking/booking.actions";

interface BookingItem {
  id: string;
  motorcycle: {
    id: string;
    licensePlate: string;
    brand: { name: string };
    category: { name: string };
  };
}

interface Booking {
  id: string;
  transactionNumber: string;
  status: "SALE" | "BOOKING" | "CANCELLED";
  createdAt: Date;
  expiresAt: Date | null;
  customer: { name: string };
  branch: { name: string };
  items: BookingItem[];
}

interface Branch {
  id: string;
  name: string;
}

interface Props {
  bookings: Booking[];
  branches: Branch[];
  userBranchId?: string;
  isAdmin: boolean;
}

export function BookingsClient({ bookings }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleConvert = async (id: string) => {
    if (!confirm("Convert this booking into a completed sale?")) return;
    setLoadingId(id);
    setError("");
    try {
      await convertBooking(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this booking? This restores the motorcycle to AVAILABLE.")) return;
    setLoadingId(id);
    setError("");
    try {
      await cancelBooking(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Bookings</h2>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-text-muted">No bookings found</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-bold font-tabular-nums">{b.transactionNumber}</p>
                  <p className="text-sm text-text-muted">
                    {b.customer.name} · {b.branch.name} ·{" "}
                    {new Date(b.createdAt).toLocaleDateString("id-ID")}
                  </p>
                  {b.expiresAt && (
                    <p className="text-xs text-text-muted">
                      Expires: {new Date(b.expiresAt).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleConvert(b.id)}
                    disabled={loadingId === b.id}
                    className="px-3 py-1 bg-brand-red text-white rounded-md text-sm hover:bg-brand-red-dark disabled:opacity-50"
                  >
                    {loadingId === b.id ? "..." : "Convert to Sale"}
                  </button>
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={loadingId === b.id}
                    className="px-3 py-1 border border-border rounded-md text-sm hover:bg-bg disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {b.items.map((item) => (
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
