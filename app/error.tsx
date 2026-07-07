"use client";

// ────────────────────────────────
// Global Error Boundary
// SECURITY.md Section 8 — generic client-facing error
// Never renders error.message or error.stack directly in production
// ────────────────────────────────

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // error is logged server-side by Next.js automatically.
  // We do NOT render error.message or error.stack to avoid leaking
  // sensitive internals in production.
  void error; // explicitly acknowledge the error object for linting

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-[#f7f7f8] p-8">
        <div className="max-w-md text-center">
          <div className="text-[80px] font-extrabold text-[#d9272e] leading-none mb-4">!</div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Something went wrong</h1>
          <p className="text-[#6b6b70] mb-8">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-[#d9272e] text-white font-semibold rounded-lg hover:bg-[#a81e23] transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
