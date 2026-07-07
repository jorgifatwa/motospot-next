"use client";

import { useState } from "react";
import { setBookingExpirationDays } from "@/modules/transaction/transaction.actions";

export function SettingsClient({ defaultDays }: { defaultDays: number }) {
  const [days, setDays] = useState(defaultDays);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await setBookingExpirationDays(days);
      setMessage("Booking expiration saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-xl font-bold text-ink">Settings</h2>

      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="font-bold mb-1">Booking Expiration</h3>
        <p className="text-sm text-text-muted mb-4">
          Bookings not converted to a sale within this many days are automatically cancelled and the
          motorcycles restored to AVAILABLE.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-body-medium font-medium mb-2">
              Expiration period (days)
            </label>
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10) || 1)}
              className="w-full px-4 py-2 border border-border rounded-md"
            />
          </div>

          {message && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
