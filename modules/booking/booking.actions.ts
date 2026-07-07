// ────────────────────────────────
// Booking Server Actions
// ARCHITECTURE.md Section 5 — thin layer over BookingService
// DATABASE.md Section 2 — booking is a Transaction with status = BOOKING
// ────────────────────────────────

"use server";

import { auth } from "@/lib/auth";
import { can, isCashier, enforceBranchScope } from "@/lib/rbac";
import { bookingService } from "./booking.service";
import { transactionService } from "@/modules/transaction/transaction.service";

export async function getBookings(options?: {
  branchId?: string;
  search?: string;
  skip?: number;
  take?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return bookingService.getAll(options);
}

export async function getBookingById(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return bookingService.getById(id);
}

export async function cancelBooking(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "manage_bookings", "booking")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  // Branch scoping: Cashier may only cancel bookings within their own branch.
  if (isCashier(session)) {
    const tx = await transactionService.getById(id);
    enforceBranchScope(session, tx.branchId);
  }

  return transactionService.cancel(id, session.user.id);
}

export async function convertBooking(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "manage_bookings", "booking")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  // Branch scoping: Cashier may only convert bookings within their own branch.
  if (isCashier(session)) {
    const tx = await transactionService.getById(id);
    enforceBranchScope(session, tx.branchId);
  }

  return transactionService.convertBookingToSale(id, session.user.id);
}

/**
 * Manual trigger for the booking expiration job (used by an admin utility / cron).
 */
export async function runBookingExpirationJob() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "manage_bookings", "booking")) {
    throw new Error("Forbidden: insufficient permissions");
  }
  return bookingService.runExpirationJob();
}
