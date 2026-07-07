# ARCHITECTURE

## 1. Purpose

This document defines the technical architecture for RNJ Motospot V2. It translates the rules defined in `BUSINESS_RULE.md` into a concrete technical structure. If any technical decision here conflicts with `BUSINESS_RULE.md`, refer to `PROJECT.md` priority order — `PROJECT.md` wins, then `BUSINESS_RULE.md`, then this document.

This document does not redefine business rules. It only defines **how** the system is built.

---

## 2. Technology Stack

| Layer                  | Choice                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| Framework              | Next.js (App Router)                                               |
| Language               | TypeScript                                                         |
| Database               | PostgreSQL                                                         |
| ORM                    | Prisma                                                             |
| Authentication         | NextAuth / Auth.js (Credentials Provider)                          |
| Styling                | Tailwind CSS (custom design system — see `UI_GUIDELINE.md`)        |
| Deployment             | VPS, self-hosted via Docker                                        |
| Image Storage          | Server-side file storage (local volume or mounted disk on the VPS) |
| Validation             | Zod                                                                |
| Data Fetching (client) | React Query (Tanstack Query)                                       |

**Rationale**: Next.js App Router allows Server Components for read-heavy pages (dashboard, motorcycle listing) while keeping Route Handlers/Server Actions for mutations. Prisma gives type-safe access to Postgres and pairs well with Zod for consistent validation on both client and server.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────┐
│              Client (Browser)            │
│   React Server/Client Components         │
│   React Query (client-side cache)        │
└───────────────────┬───────────────────────┘
                    │
┌───────────────────▼───────────────────────┐
│           Next.js App (VPS/Docker)         │
│                                             │
│  app/ (routes, layouts, pages)              │
│  ├─ Server Components (read)               │
│  ├─ Server Actions / Route Handlers (write) │
│                                             │
│  Application Layer                         │
│  ├─ Service (business logic)                │
│  ├─ Repository (Prisma queries)             │
│  ├─ Validation (Zod schemas)                 │
│  └─ Middleware (auth guard, RBAC guard)      │
└───────────────────┬───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌─────────▼─────────┐
│   PostgreSQL     │    │  File Storage      │
│   (via Prisma)    │    │  (motor images)    │
└──────────────────┘    └────────────────────┘
```

---

## 4. Folder Structure

```
motospot-next/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── motorcycles/
│   │   ├── transactions/
│   │   ├── bookings/
│   │   ├── master-data/
│   │   │   ├── brands/
│   │   │   ├── categories/
│   │   │   └── branches/
│   │   ├── users/
│   │   └── settings/
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── ...route handlers for webhook-like/external needs only
│
├── modules/                      # feature-first business logic (NOT app router)
│   ├── motorcycle/
│   │   ├── motorcycle.service.ts
│   │   ├── motorcycle.repository.ts
│   │   ├── motorcycle.schema.ts    (Zod)
│   │   └── motorcycle.actions.ts   (Server Actions)
│   ├── transaction/
│   ├── booking/
│   ├── branch/
│   ├── user/
│   └── audit-log/
│
├── components/
│   ├── ui/                        # base design system components
│   └── shared/                    # composed, reusable business components
│
├── lib/
│   ├── prisma.ts                  # Prisma client singleton
│   ├── auth.ts                    # NextAuth config
│   ├── rbac.ts                    # permission-checking helpers
│   ├── storage.ts                 # image storage read/write helpers
│   └── audit.ts                   # audit log helper
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docs/                          # PROJECT.md, BUSINESS_RULE.md, etc.
├── storage/                       # actual image files (mounted volume in Docker)
└── docker-compose.yml
```

**Principle**: Business logic lives in `modules/`, not inside `app/`. Route files in `app/` should stay thin — they call a service function and render. This directly addresses the old system's weakness of "logic bisnis di controller."

---

## 5. Layered Responsibility

Each module follows a strict layering pattern to avoid the old codebase's duplication and inconsistency problems:

1. **Schema (Zod)** — defines and validates input shape. Shared between client form and server action.
2. **Repository** — the only layer allowed to call Prisma directly. Pure data access, no business rules.
3. **Service** — business logic and rule enforcement (e.g. "a motorcycle in MAINTENANCE cannot be booked"). Calls one or more repositories. This is where `BUSINESS_RULE.md` rules are implemented in code.
4. **Server Action / Route Handler** — thin layer that validates session/role, parses input with schema, calls service, returns result.

No layer should be skipped. A Server Action must never call Prisma directly — it must go through a Service.

---

## 6. Authentication (NextAuth / Auth.js)

- Credentials Provider is used (email/username + password), matching the existing login flow style.
- Session strategy: **database sessions** (not pure JWT), so sessions can be revoked server-side (e.g. force logout on role change) — this also gives an audit-friendly session table.
- `lib/auth.ts` exports the NextAuth config, including a `session` callback that injects `role` and `branchId` into the session object so RBAC checks don't require an extra database round-trip on every request.

---

## 7. Authorization / RBAC

- Two roles exist at launch: `ADMIN`, `CASHIER` (per `BUSINESS_RULE.md` Section 2). The permission model should not hardcode this to exactly two, so more roles can be added later without a schema rewrite.
- `lib/rbac.ts` provides a single `can(session, action, resource)`-style helper used consistently across Server Actions and Server Components — this replaces the old `is_can_create/read/update/delete` scattered properties from `Admin_Controller`.
- **Branch scoping is enforced at the Service layer**, not just the UI. Every Service function for Cashier-accessible resources (transactions, bookings) must filter by `session.branchId` internally — the API must never trust a `branchId` passed from the client for a Cashier session.

---

## 8. Database Access (Prisma)

- One Prisma Client singleton (`lib/prisma.ts`) to avoid exhausting Postgres connections in development (Next.js hot reload issue).
- All foreign keys use proper Postgres foreign key constraints — this directly fixes the old system's "no foreign key constraints" weakness.
- Soft delete is implemented via a `deletedAt DateTime?` column on every entity that requires history preservation (Motorcycle, Brand, Category, Branch, Customer), per `BUSINESS_RULE.md` Section 15. Queries default to filtering `deletedAt: null` unless explicitly querying history.
- See `DATABASE.md` for the full schema definition.

---

## 9. Image Handling

Per `BUSINESS_RULE.md` Section 5.1:

- Images are uploaded via a Server Action that streams the file to `storage/motorcycles/{motorcycleId}/` on the VPS disk (mounted as a Docker volume so it persists across container restarts/deploys).
- Only the resulting relative path is saved in the database (`MotorImage.path`), never the binary.
- `lib/storage.ts` centralizes all file read/write/delete logic, so there's a single place to swap to S3-compatible object storage later without touching business logic (aligned with `BUSINESS_RULE.md` Section 16, Future Scalability — cloud image storage).
- No file count limit is enforced by the storage layer; the UI paginates/lazily loads gallery thumbnails for performance instead of restricting uploads.

---

## 10. Audit Trail

- A dedicated `AuditLog` table (see `DATABASE.md`) records: actor (userId), action, entity type, entity id, timestamp, and a JSON diff/snapshot where relevant.
- `lib/audit.ts` exposes a single `logAudit()` function called from the Service layer after any state-changing operation (create/update/delete/booking expiration/cancellation) — never from the UI layer, so it can't be bypassed.
- Audit log records are insert-only; no update or delete operation is exposed for this table anywhere in the app.

---

## 11. Booking Expiration (Automated Job)

Since bookings must auto-expire (`BUSINESS_RULE.md` Section 9.2), and this is a VPS/Docker deployment (not serverless), this is implemented as:

- A scheduled job (e.g. `node-cron` running inside the same Docker container, or a separate lightweight worker container) that runs periodically (e.g. every 15 minutes), checks for bookings past their expiration date, and calls the same Booking Service cancellation logic used by manual cancellation — ensuring consistent audit logging and status updates.

---

## 12. API Surface

- Internal UI mutations use **Server Actions**, not a separate REST API, since there is no external consumer at launch.
- Route Handlers (`app/api/...`) are reserved for: NextAuth callback routes, and any future public catalog API (per `BUSINESS_RULE.md` Section 16).
- This avoids maintaining a redundant REST layer purely for internal use, unlike the old CodeIgniter REST Server setup.

---

## 13. Deployment (VPS / Docker)

```
docker-compose.yml
├── app        (Next.js production build)
├── postgres   (PostgreSQL, with a named volume for data)
└── (storage volume mounted into `app` for motorcycle images)
```

- Environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, storage path, SMTP credentials if used, etc.) are provided via `.env`, never committed to source control — this fixes the old system's "credential in config file" weakness.
- Database migrations run via `prisma migrate deploy` as a release step before the app container starts.
- `NODE_ENV=production` must always disable verbose error/debug output to the client — this fixes the old system's "debug mode in production" issue.

---

## 14. Cross-References

- Business logic implemented here must match `BUSINESS_RULE.md`.
- Table/column definitions referenced here are detailed in `DATABASE.md`.
- Naming conventions, folder/file naming, and code style are detailed in `CODING_STANDARD.md`.
- Component visual structure and design tokens are detailed in `UI_GUIDELINE.md`.
- Any additional security requirements (rate limiting, input sanitization specifics, CSRF/XSS handling) are detailed in `SECURITY.md`.
