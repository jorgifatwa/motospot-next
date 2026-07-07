// ────────────────────────────────
// Booking Expiration Job (Node runtime only)
// ARCHITECTURE.md Section 11 — scheduled job that auto-cancels expired bookings.
// Uses node-cron (already a project dependency) to run every 15 minutes.
// Delegates to TransactionService.expireOverdueBookings so the same audit +
// motorcycle-status-restoration logic used by manual cancellation applies.
// ────────────────────────────────

import cron from "node-cron";
import { transactionService } from "@/modules/transaction/transaction.service";

let started = false;

export function startBookingExpirationJob(): void {
  if (started) return;
  started = true;

  // Every 15 minutes. node-cron uses the server's local timezone.
  cron.schedule("*/15 * * * *", async () => {
    try {
      const count = await transactionService.expireOverdueBookings();
      if (count > 0) {
        console.log(`[booking-expiration] Auto-cancelled ${count} expired booking(s).`);
      }
    } catch (error) {
      console.error("[booking-expiration] Job failed:", error);
    }
  });

  console.log("[booking-expiration] Scheduled job started (every 15 minutes).");
}
