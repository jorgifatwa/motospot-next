// ────────────────────────────────
// 404 Not Found Page
// SECURITY.md Section 8 — generic client-facing page, no stack traces
// ────────────────────────────────

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8] p-8">
      <div className="max-w-md text-center">
        <div className="text-[100px] font-extrabold text-[#d9272e] leading-none mb-4">404</div>
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Page not found</h1>
        <p className="text-[#6b6b70] mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-[#d9272e] text-white font-semibold rounded-lg hover:bg-[#a81e23] transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
