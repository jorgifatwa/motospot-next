// ────────────────────────────────
// NextAuth Type Augmentation
// ARCHITECTURE.md Section 6 — session.user.role and session.user.branchId
// ────────────────────────────────

import { type UserRole } from "@prisma/client";
import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      branchId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    branchId: string | null;
    employeeId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    branchId: string | null;
  }
}
