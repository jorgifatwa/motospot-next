// ────────────────────────────────
// Booking Service
// ARCHITECTURE.md Section 5 — business logic layer
// DATABASE.md Section 2 — a "booking" is a Transaction with status = BOOKING.
// This module is a thin domain facade over TransactionService so booking-specific
// logic (expiration, listing) stays cohesive without duplicating transaction logic.
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { isCashier, enforceBranchScope } from "@/lib/rbac";
import { transactionService } from "@/modules/transaction/transaction.service";

export class BookingService {
  /**
   * List bookings (Transactions with status = BOOKING), branch-scoped for Cashier.
   */
  async getAll(options?: { branchId?: string; search?: string; skip?: number; take?: number }) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    let effectiveBranchId = options?.branchId;
    if (isCashier(session)) {
      effectiveBranchId = enforceBranchScope(session, options?.branchId);
    }

    return transactionService.getAll({
      branchId: effectiveBranchId || undefined,
      status: "BOOKING",
      search: options?.search,
      skip: options?.skip,
      take: options?.take,
    });
  }

  async getById(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    return transactionService.getById(id);
  }

  /**
   * Run the booking expiration job (ARCHITECTURE.md Section 11).
   * Delegates to the shared TransactionService.cancel so audit + status
   * restoration stay consistent with manual cancellation.
   */
  async runExpirationJob(): Promise<number> {
    return transactionService.expireOverdueBookings();
  }
}

export const bookingService = new BookingService();
