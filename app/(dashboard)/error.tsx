"use client";

// ────────────────────────────────
// Dashboard Error Boundary
// SECURITY.md Section 8 — generic client-facing error within dashboard scope
// Never renders error.message or error.stack
// ────────────────────────────────

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md text-center">
        <div className="text-[80px] font-extrabold text-[#d9272e] leading-none mb-4">!</div>
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Something went wrong</h2>
        <p className="text-[#6b6b70] mb-8">
          An unexpected error occurred on this page. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-[#d9272e] text-white font-semibold rounded-lg hover:bg-[#a81e23] transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
