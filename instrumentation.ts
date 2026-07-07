// ────────────────────────────────
// Instrumentation
// ARCHITECTURE.md Section 11 — Booking Expiration scheduled job
// Runs inside the Next.js server process (Node runtime). Uses node-cron to
// periodically auto-cancel expired bookings by calling the shared
// TransactionService.cancel logic (consistent audit + status restoration).
// ────────────────────────────────

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Defer import so the edge runtime never loads node-cron / prisma.
    const { startBookingExpirationJob } = await import("./instrumentation.node");
    startBookingExpirationJob();
  }
}
