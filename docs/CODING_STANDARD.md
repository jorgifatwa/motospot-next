# CODING STANDARD

## 1. Purpose

This document defines coding conventions for RNJ Motospot V2. It exists to prevent the inconsistency problems identified in the old codebase (mixed naming styles, duplicate files, missing type safety, scattered business logic). Every contributor — human or AI agent (Cline) — must follow this document when generating code.

---

## 2. Naming Conventions

| Item                   | Convention                                                                | Example                                             |
| ---------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| Folder names           | kebab-case                                                                | `motorcycle/`, `master-data/`                       |
| React component files  | PascalCase                                                                | `MotorcycleCard.tsx`                                |
| Non-component TS files | kebab-case                                                                | `motorcycle.service.ts`, `motorcycle.repository.ts` |
| React component names  | PascalCase                                                                | `function MotorcycleCard()`                         |
| Variables / functions  | camelCase                                                                 | `getMotorcycleById`                                 |
| Types / Interfaces     | PascalCase, no `I` prefix                                                 | `Motorcycle`, `CreateMotorcycleInput`               |
| Enums                  | PascalCase name, UPPER_CASE members                                       | `enum SalesStatus { AVAILABLE, BOOKED, SOLD }`      |
| Constants              | UPPER_SNAKE_CASE                                                          | `MAX_UPLOAD_SIZE_MB`                                |
| Database tables/fields | Managed by Prisma — PascalCase model, camelCase field (see `DATABASE.md`) | `Motorcycle.licensePlate`                           |
| Zod schema files       | `*.schema.ts`                                                             | `motorcycle.schema.ts`                              |
| Server Action files    | `*.actions.ts`                                                            | `motorcycle.actions.ts`                             |

**Rule**: One concept, one name, used consistently everywhere (file, variable, route segment). No mixing `History_transaksi` style snake_case with PascalCase in the same layer, as happened in the old codebase.

---

## 3. File Organization Rules

- **No duplicate files.** If a file needs a variant, it must be a proper new file with a clear name (e.g. `motorcycle.repository.ts` and `motorcycle.repository.test.ts`), never `motorcycle.repository copy.ts`.
- **No orphaned/unused files committed.** No leftover `.rar`, `.zip`, or commented-out legacy files in the repository. If code is no longer used, delete it — git history preserves it.
- One module = one folder under `modules/`, containing at most: `*.schema.ts`, `*.repository.ts`, `*.service.ts`, `*.actions.ts`, and an optional `*.test.ts`.
- Shared/reusable UI lives in `components/ui/`; feature-specific composed components live in `components/shared/` or colocated inside the relevant `app/` route folder.

---

## 4. TypeScript Rules

- `strict: true` must remain enabled in `tsconfig.json`. Never disable strict mode to silence errors.
- **No `any`.** If a type is genuinely unknown, use `unknown` and narrow it. This fixes the old system's "PHP 5 style, no type hinting" weakness at the TypeScript level.
- Avoid double-casting workarounds like `as unknown as X`. If a cast is required, prefer a proper type guard or fixing the source of the type mismatch (e.g. a mapper function that returns the correct shape).
- All function signatures for Services and Repositories must have explicit input and return types — do not rely on inference alone for public-facing functions.
- Shared types derived from Prisma models should be imported from `@prisma/client` directly rather than manually re-declared, to avoid drift between schema and types.

---

## 5. Component Conventions

- Prefer **Server Components** by default. Add `'use client'` only when the component needs interactivity (state, event handlers, browser APIs).
- Components should not directly call Prisma or Services from a Client Component — Client Components call Server Actions; Server Components may call Services directly during render.
- Keep components focused: a component handling both data-fetching orchestration and detailed presentation should be split into a container (Server Component) and a presentational piece (Client Component), when the presentational piece needs interactivity.
- No inline business logic inside JSX event handlers beyond simple calls (e.g. `onClick={() => cancelBooking(id)}`) — the actual logic belongs in the Service layer.

---

## 6. React Query Usage (Client-Side Data)

- Query keys follow a consistent array structure: `['motorcycle', 'list', filters]`, `['motorcycle', 'detail', id]` — this avoids ad-hoc key strings that cause cache-invalidation bugs.
- Mutations must invalidate the relevant query keys on success (e.g. creating a transaction invalidates `['motorcycle', 'list']` and `['transaction', 'list']`).
- Debounce user input (e.g. search fields) before triggering a query, consistent with patterns already used in the current Bank Jakarta frontend work.

---

## 7. Validation (Zod)

- Every Server Action and Route Handler must validate its input with a Zod schema before passing data to a Service. No raw, unvalidated `FormData` or JSON body should reach a Service function.
- Schemas are defined once per module in `*.schema.ts` and reused on both client (form validation) and server (Server Action validation) to avoid duplicated/divergent validation logic.
- Validation error messages returned to the client must be structured (field → message), never a single opaque string, so forms can highlight the exact invalid field.

---

## 8. Error Handling

- Services throw typed, descriptive errors (e.g. a custom `BusinessRuleError` class) rather than generic `Error` or silent `null` returns — this fixes the old system's "banyak operasi tanpa try-catch... tidak ada feedback yang jelas."
- Server Actions catch errors at the boundary and translate them into a consistent response shape, e.g.:

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };
```

- Never expose raw database or stack trace details to the client in production. Log full error details server-side (console/logging service); return a safe, generic message to the client for unexpected errors.

---

## 9. Database & Prisma Conventions

- Only Repository files may import and use `PrismaClient`. Services, Actions, and Components must never import Prisma directly.
- Every query that reads user-facing lists of soft-deletable entities must include `where: { deletedAt: null }` unless explicitly querying historical/audit data.
- Multi-step writes that must be atomic (e.g. creating a Transaction + its TransactionItems + updating Motorcycle statuses) must use `prisma.$transaction(...)`.

---

## 10. Git & Commit Conventions

- Commit messages follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
- One logical change per commit — avoid bundling unrelated fixes into one commit, which made the old codebase's history hard to audit.
- Branch naming: `feature/<short-description>`, `fix/<short-description>`.

---

## 11. Testing

- Services (business logic layer) should have unit tests covering the rules in `BUSINESS_RULE.md` directly — e.g. "cannot book a motorcycle already booked," "cancelling a transaction restores all its motorcycles."
- Repository layer can be tested with an integration test against a test database, not mocked Prisma calls, to catch real constraint violations.
- No feature that implements a rule from `BUSINESS_RULE.md` Section 14 (Data Integrity Rules) should ship without a corresponding test.

---

## 12. Linting & Formatting

- ESLint + Prettier are enforced via a pre-commit hook (e.g. Husky + lint-staged). Code that fails lint must not be committed.
- No commented-out dead code blocks left in committed files.
- No hardcoded magic values that represent business rules (e.g. booking expiration days) — these belong in configuration/environment or a settings table, not inline literals.

---

## 13. Cross-References

- Folder/module structure referenced here follows `ARCHITECTURE.md` Section 4–5.
- Any rule implemented in a Service must map back to a rule in `BUSINESS_RULE.md` — if it doesn't, flag it for clarification rather than inventing new behavior.
- Visual/styling conventions are defined separately in `UI_GUIDELINE.md`.
