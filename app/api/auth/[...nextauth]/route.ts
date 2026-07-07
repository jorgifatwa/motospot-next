// ────────────────────────────────
// NextAuth Route Handler
// ARCHITECTURE.md Section 6 — API route for NextAuth
// ────────────────────────────────

import { handlers } from "@/lib/auth";
import { NextResponse } from "next/server";

export const { GET, POST } = handlers;

// Export for Next.js App Router
export const runtime = "nodejs";
