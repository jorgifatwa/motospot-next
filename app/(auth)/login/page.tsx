// ────────────────────────────────
// Login Page
// UI_GUIDELINE.md — Bold & Modern design
// ────────────────────────────────

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-md px-6">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-extrabold text-ink mb-2">RNJ Motospot</h1>
          <p className="text-text-muted text-body">Motorcycle Dealership Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-border rounded-lg p-8">
          <h2 className="font-display text-h1 font-bold text-ink mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-status-cancelled/10 border border-status-cancelled/20 rounded-md">
              <p className="text-status-cancelled text-body-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-body-medium font-medium text-ink mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-md bg-bg text-ink placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-body-medium font-medium text-ink mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-md bg-bg text-ink placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-brand-red-dark text-white font-display font-bold py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-body text-text-muted">Need help? Contact your administrator</p>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-caption text-text-muted mt-6">
          © 2026 RNJ Motospot. All rights reserved.
        </p>
      </div>
    </div>
  );
}
