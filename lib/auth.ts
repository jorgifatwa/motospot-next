// ────────────────────────────────
// NextAuth Configuration
// ARCHITECTURE.md Section 6 — Credentials Provider, database session strategy
// SECURITY.md Section 5 — rate limiting integration
// ────────────────────────────────

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  DEFAULT_RATE_LIMIT,
} from "@/lib/rate-limit";
import { logAuthEvent } from "@/lib/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "database",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Get client IP for rate limiting
        // Note: In production, use proper IP extraction from headers
        const identifier = email; // Using email as identifier (could be IP in production)

        // Check rate limit
        const rateLimitResult = checkRateLimit(identifier, DEFAULT_RATE_LIMIT);

        if (!rateLimitResult.allowed) {
          throw new Error(
            rateLimitResult.error || "Too many failed attempts. Please try again later.",
          );
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { employee: true },
        });

        if (!user || user.deletedAt) {
          // Record failed attempt
          recordFailedAttempt(identifier, DEFAULT_RATE_LIMIT);
          // Log failed login attempt (SECURITY.md Section 10, ARCHITECTURE.md Section 10)
          await logAuthEvent(null, "LOGIN_FAILED", email, {
            reason: user?.deletedAt ? "account_deleted" : "user_not_found",
          });
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          // Record failed attempt
          recordFailedAttempt(identifier, DEFAULT_RATE_LIMIT);
          // Log failed login attempt (SECURITY.md Section 10, ARCHITECTURE.md Section 10)
          await logAuthEvent(null, "LOGIN_FAILED", email, {
            reason: "invalid_password",
            userId: user.id,
          });
          return null;
        }

        // Clear rate limit on successful login
        clearRateLimit(identifier);

        // Log successful login (SECURITY.md Section 10, ARCHITECTURE.md Section 10)
        await logAuthEvent(user.id, "LOGIN_SUCCESS", email, {
          userName: user.name,
          userRole: user.role,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Inject role and branchId into the session object (ARCHITECTURE.md Section 6)
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.branchId = user.branchId ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
