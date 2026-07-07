# ROADMAP

## 1. Purpose

This document defines the implementation phases for RNJ Motospot V2. It exists so Cline executes work in a dependency-safe order — foundation before features, core sales flow before secondary modules — instead of building modules in parallel with unresolved dependencies.

Each phase assumes all documents up to `SECURITY.md` are finalized. If a rule changes mid-phase, `PROJECT.md`'s priority order still applies: fix the source document first, then resume implementation.

---

## 2. Phase 0 — Project Foundation

**Goal**: A running skeleton, nothing business-specific yet.

- Initialize Next.js (App Router, TypeScript) project structure per `ARCHITECTURE.md` Section 4.
- Set up Docker Compose (`app`, `postgres`) per `ARCHITECTURE.md` Section 13.
- Configure Prisma, connect to Postgres, run an empty initial migration.
- Configure ESLint, Prettier, Husky + lint-staged per `CODING_STANDARD.md` Section 12.
- Set up `.env.example` and `.env` per `SECURITY.md` Section 7.
- Set up base Tailwind config with design tokens from `UI_GUIDELINE.md` Section 2–3 (colors, spacing, typography) — no pages yet, just the token setup.

**Exit criteria**: `docker compose up` runs the app and connects to Postgres successfully; lint/format hooks work.

---

## 3. Phase 1 — Authentication & RBAC Shell

**Goal**: Login works, roles exist, protected routes exist — before any business feature.

- Implement `User`, `Account`, `Session`, `VerificationToken` models (`DATABASE.md` Section 3).
- Configure NextAuth Credentials Provider + database session strategy (`ARCHITECTURE.md` Section 6).
- Implement `lib/rbac.ts` with the `can()` helper (`ARCHITECTURE.md` Section 7).
- Build login page using `UI_GUIDELINE.md` direction (not a generic template login form).
- Build protected dashboard layout shell (`app/(dashboard)/layout.tsx`) with sidebar per `UI_GUIDELINE.md` Section 8, but with placeholder nav items only.
- Seed one Admin user **and its corresponding Employee record** via `prisma/seed.ts`, per `DATABASE.md` Section 4.7 (bootstrap note) — the mandatory User-Employee link must hold from the very first account.
- Apply password policy and rate limiting per `SECURITY.md` Section 5.

**Exit criteria**: Admin can log in, sees the dashboard shell; a Cashier account (seeded manually for testing) is correctly restricted from admin-only routes.

---

## 4. Phase 2 — Master Data

**Goal**: Data that everything else depends on: Branch, Brand, Category, Employee.

- Implement `Branch`, `Brand`, `Category`, `Employee` models — already defined in `DATABASE.md`.
- Employee creation must be implemented as a single atomic operation that also creates the linked `User` login account (role + initial/temporary password), per `BUSINESS_RULE.md` Section 11 and `DATABASE.md` Section 4.7. Use `prisma.$transaction` so both records succeed or fail together.
- Build CRUD UI + Server Actions for each, following the layered pattern in `ARCHITECTURE.md` Section 5 (schema → repository → service → action).
- Apply soft delete consistently (`deletedAt`) per `BUSINESS_RULE.md` Section 15.
- Link `User.branchId` assignment (Admin can assign a Cashier to a branch).
- Wire up `AuditLog` writes for every create/update/delete on master data (`ARCHITECTURE.md` Section 10).

**Exit criteria**: An Admin can fully manage branches, brands, categories, and employees; every change appears in the audit log.

---

## 5. Phase 3 — Motorcycle Management

**Goal**: The core asset entity, including image handling.

- Implement `Motorcycle` and `MotorImage` models per `DATABASE.md`.
- Build motorcycle create/edit form with all fields from `BUSINESS_RULE.md` Section 5.
- Implement image upload flow per `BUSINESS_RULE.md` Section 5.1 and `SECURITY.md` Section 9 (MIME validation, size limit, randomized filenames, storage in `storage/motorcycles/{id}/`).
- Build motorcycle list/grid page using the card design in `UI_GUIDELINE.md` Section 9, with filters (branch, brand, category, operational/sales status).
- Enforce `operationalStatus`/`salesStatus` state rules per `BUSINESS_RULE.md` Section 4.3 at the Service layer (e.g. cannot manually set a `MAINTENANCE` motorcycle to `BOOKED`).

**Exit criteria**: Admin can create a motorcycle with an unlimited image gallery, one main image, correct status behavior, and it appears correctly in the branch-filtered list.

---

## 6. Phase 4 — Sales Transactions & Booking

**Goal**: The central business flow — this is the highest-priority feature functionally.

- Implement `Customer`, `Transaction`, `TransactionItem` models per `DATABASE.md`.
- Build the "Create Transaction" flow: search available motorcycles (branch-scoped for Cashier) → cart (multi-motorcycle) → customer info → status selection (`SALE`/`BOOKING`) per `BUSINESS_RULE.md` Section 6.
- Implement transaction number generation (`TRX-YYYYMMDD-00001`) per `BUSINESS_RULE.md` Section 8, ensuring uniqueness under concurrent requests (e.g. via a Postgres sequence or transaction-safe counter, not a naive "count + 1").
- Implement the Status Mapping enforcement (`BUSINESS_RULE.md` Section 7.2) inside the Transaction Service — this is the single place motorcycle status is updated as a side effect of a transaction.
- Implement transaction cancellation: restores **all** motorcycles in that transaction to `AVAILABLE` (per `BUSINESS_RULE.md` Section 6.2), only if their `operationalStatus` is `AVAILABLE`.
- Implement Booking Expiration scheduled job (`ARCHITECTURE.md` Section 11), calling the same cancellation Service logic, with configurable expiration duration (Admin setting).
- Implement booking → sale conversion and booking cancellation permissions per `BUSINESS_RULE.md` Section 9.1: Cashier is restricted to bookings within their own branch; Administrator can act across all branches. Enforce this in the Service layer, not just the UI.
- Wire up `AuditLog` for transaction creation, cancellation, booking conversion, and automatic booking expiration.

**Exit criteria**: A Cashier can create a multi-motorcycle sale or booking scoped to their branch; booking auto-expires correctly; cancellation restores motorcycle availability; everything is audit-logged.

---

## 7. Phase 5 — Dashboard & Reporting

**Goal**: Business visibility, once transactional data actually exists to report on.

- Build dashboard cards/metrics per `BUSINESS_RULE.md` Section 12 (total/available/maintenance/sold motorcycles, total sales, monthly/yearly revenue).
- Implement branch filter for Admin.
- Use `priceAtSale` snapshots (`DATABASE.md` Section 4.4) for historically accurate revenue, not live `Motorcycle.sellingPrice`.
- Apply bold KPI typography per `UI_GUIDELINE.md` Section 5.

**Exit criteria**: Dashboard numbers are correct and match manually-verified transaction data, including after price edits on already-sold motorcycles.

---

## 8. Phase 6 — Hardening & Polish

**Goal**: Production readiness — security, UX completeness, ops.

- Full pass on `SECURITY.md`: HTTPS/reverse proxy config, Postgres not publicly exposed, automated backups, dependency audit.
- Full pass on `UI_GUIDELINE.md` Section 7: loading skeletons and empty states on every list/table (explicitly missing in the old system).
- Cross-check every rule in `BUSINESS_RULE.md` Section 14 (Data Integrity Rules) has a corresponding automated test, per `CODING_STANDARD.md` Section 11.
- Load-test the motorcycle search/list and dashboard queries; verify indexes from `DATABASE.md` Section 4.6 are actually effective (`EXPLAIN ANALYZE`).
- Final review: no duplicate files, no dead code, no hardcoded secrets — a direct checklist against every weakness listed in the original system analysis.

**Exit criteria**: The application can be confidently deployed to the VPS for real dealership use.

---

## 9. Explicit Non-Goals for Initial Release

Per `BUSINESS_RULE.md` Section 16, these are acknowledged future scope and should **not** be started before Phase 6 is complete, to avoid scope creep during core development:

- Notification system
- Payment integration
- Digital invoice generation
- Multi-company support
- Cloud image storage migration (S3-compatible)
- Mobile application
- Public motorcycle catalog

---

## 10. Cross-References

- Each phase's technical structure follows `ARCHITECTURE.md`.
- Each phase's data model follows `DATABASE.md`.
- Each phase's business rules follow `BUSINESS_RULE.md`.
- Coding conventions during all phases follow `CODING_STANDARD.md`.
- Visual implementation during all phases follows `UI_GUIDELINE.md`.
- Security requirements apply continuously, not just in Phase 6 — Phase 6 is a final audit pass, not the only time security is considered.
