# SECURITY

## 1. Purpose

This document defines security requirements for RNJ Motospot V2. Each section maps directly to a weakness identified in the old CodeIgniter system, ensuring it cannot resurface in the new stack.

---

## 2. SQL Injection Prevention

**Old weakness**: Manual string-concatenated queries (e.g. `WHERE cabang_id = $cabang_id`) with unescaped POST input.

**Rule**:

- All database access goes through **Prisma** (see `ARCHITECTURE.md` Section 5, 8; `CODING_STANDARD.md` Section 9). Prisma parameterizes queries automatically — raw SQL (`$queryRaw`/`$executeRaw`) is disallowed unless explicitly reviewed, and if used, must use Prisma's tagged-template parameterization (`Prisma.sql`), never plain string interpolation.
- Any raw query, if unavoidable, requires a code review comment explaining why Prisma's query builder couldn't express it.

---

## 3. XSS (Cross-Site Scripting) Prevention

**Old weakness**: Data rendered directly without `htmlspecialchars()`/`xss_clean()`.

**Rule**:

- React escapes rendered text by default — **never use `dangerouslySetInnerHTML`** unless the content is rich text explicitly sanitized server-side first (e.g. with a library like `sanitize-html`), and only for admin-authored content, never raw user/customer input.
- All user-supplied text (customer name, notes, etc.) is treated as plain text for display purposes.
- Content-Security-Policy header is configured in `next.config.ts` to restrict script sources.

---

## 4. CSRF Protection

**Old weakness**: Inconsistent CSRF protection — not all forms covered.

**Rule**:

- Since mutations go through **Server Actions** (see `ARCHITECTURE.md` Section 12), Next.js's built-in Server Action origin-checking applies automatically to every mutation — there is no form in the app that bypasses this, because there is no separate manually-built form-post mechanism outside Server Actions.
- Any Route Handler that accepts state-changing requests (if added later, e.g. for a future public API) must implement explicit CSRF/token verification and must not rely on cookies alone for authentication of cross-origin requests.

---

## 5. Authentication & Password Policy

**Old weakness**: bcrypt rounds 8, no enforced password policy.

**Rule**:

- Passwords are hashed with **bcrypt, minimum 12 rounds** (adjustable upward as server capacity allows).
- Minimum password policy enforced at account creation/reset: minimum 10 characters, must not equal the user's email/name.
- Login attempts are rate-limited (e.g. lock or delay after 5 failed attempts within 10 minutes) to prevent brute force.
- Sessions use NextAuth's database session strategy (see `ARCHITECTURE.md` Section 6), allowing server-side session revocation (e.g. immediately invalidate sessions when an Administrator disables a user account).

---

## 6. Authorization Enforcement

**Old weakness**: Privilege checks scattered across controller properties (`is_can_create`, etc.), inconsistently applied.

**Rule**:

- All authorization checks go through the single `lib/rbac.ts` helper described in `ARCHITECTURE.md` Section 7 — no ad-hoc `if (user.role === 'ADMIN')` checks scattered across components.
- **Branch scoping is enforced server-side in the Service layer**, never trusted from client input (see `ARCHITECTURE.md` Section 7) — a Cashier session cannot access another branch's data even if a request is crafted manually.
- Every Server Action must re-verify the session and role at the top of the function — UI-level hiding of buttons/menus is not a substitute for server-side authorization.

---

## 7. Credential & Secrets Management

**Old weakness**: Database and SMTP passwords stored directly in config files committed to the repo.

**Rule**:

- All secrets (`DATABASE_URL`, `NEXTAUTH_SECRET`, SMTP credentials, storage paths) are provided via environment variables (`.env`), which must be listed in `.gitignore` and never committed.
- `.env.example` (with placeholder values only) is committed to document required variables.
- Production secrets are managed on the VPS via Docker environment variables or a secrets file outside the repository, per `ARCHITECTURE.md` Section 13.

---

## 8. Environment & Debug Configuration

**Old weakness**: `db_debug` active in production; verbose errors shown to users.

**Rule**:

- `NODE_ENV=production` must be enforced in the Docker production image.
- Prisma's verbose query logging is disabled in production (enabled only in local development).
- Unhandled errors return a generic message to the client; full details are logged server-side only (see `CODING_STANDARD.md` Section 8).
- Next.js custom error pages (`error.tsx`, `not-found.tsx`) must never leak stack traces to the end user in production.

---

## 9. File Upload Security (Motorcycle Images)

Given `BUSINESS_RULE.md` Section 5.1 allows unlimited image uploads:

- Validate file **MIME type and extension** (only `image/jpeg`, `image/png`, `image/webp` accepted) before storing.
- Enforce a **per-file size limit** (e.g. 5MB) to prevent storage abuse, even though there's no limit on the _number_ of images.
- Generated file names must be randomized/hashed (not the original uploaded filename) before storing on disk, to prevent path traversal and filename-collision attacks.
- Uploaded images are stored outside the web-servable static root unless served through a controlled route/handler, so arbitrary file access isn't possible by guessing paths.

---

## 10. Audit Trail as a Security Control

- Per `ARCHITECTURE.md` Section 10, all state-changing actions are logged to `AuditLog`, including login events. This supports incident investigation (e.g. "who cancelled this sale and when") that the old system lacked entirely.
- Audit logs are insert-only at the application level — no UI or API path exists to edit or delete them.

---

## 11. Transport & Infrastructure

- HTTPS is enforced in production (TLS terminated at a reverse proxy, e.g. Caddy or Nginx, in front of the Docker app container).
- PostgreSQL is not exposed on a public port on the VPS — only accessible within the Docker internal network.
- Regular automated database backups (e.g. nightly `pg_dump` to a separate storage location) — this fixes the old system's "no automatic backup" weakness, and should be scheduled as part of VPS deployment ops (outside the app codebase itself).

---

## 12. Dependency Management

- Dependencies are kept up to date; `npm audit` (or equivalent) should be run periodically to catch known vulnerabilities — not a one-time setup concern.
- Avoid adding unmaintained or unnecessary third-party packages, particularly anything handling authentication, file parsing, or database access outside of the already-chosen stack (Prisma, NextAuth, Zod).

---

## 13. Cross-References

- Authorization implementation details are in `ARCHITECTURE.md` Section 7.
- Error handling conventions are in `CODING_STANDARD.md` Section 8.
- Deployment/environment setup is in `ARCHITECTURE.md` Section 13.
