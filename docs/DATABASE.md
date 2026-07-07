# DATABASE

## 1. Purpose

This document defines the database schema for RNJ Motospot V2, implemented with **PostgreSQL** and **Prisma**. Every table here is a direct technical translation of `BUSINESS_RULE.md`. If a field or constraint here seems to add a rule not present in `BUSINESS_RULE.md`, it should be flagged and reconciled rather than assumed correct.

---

## 2. Entity Overview

```
Branch ──┬── User (Cashier scoped to 1 branch)
         ├── Employee
         ├── Motorcycle ──── MotorImage (1-to-many)
         └── Transaction ──── TransactionItem ──── Motorcycle

Brand ──── Motorcycle
Category ── Motorcycle
Customer ── Transaction
User ────── Transaction (createdBy)
User ────── AuditLog
```

Key relations:

- One **Branch** has many Users (Cashiers), Employees, Motorcycles, Transactions.
- One **Motorcycle** has many **MotorImage** (gallery), and exactly one is flagged `isMain`.
- One **Transaction** has many **TransactionItem**, each pointing to one Motorcycle — this is how a transaction supports multiple motorcycles (`BUSINESS_RULE.md` Section 6.2).
- **Booking** is _not_ a separate table. A "booking" is simply a `Transaction` with `status = BOOKING`. This avoids duplicating transaction logic across two tables, and keeps the Status Mapping in `BUSINESS_RULE.md` Section 7.2 as the single source of truth.

---

## 3. Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ────────────────────────────────
// ENUMS
// ────────────────────────────────

enum UserRole {
  ADMIN
  CASHIER
}

enum OperationalStatus {
  AVAILABLE
  MAINTENANCE
}

enum SalesStatus {
  AVAILABLE
  BOOKED
  SOLD
}

enum TransactionStatus {
  SALE
  BOOKING
  CANCELLED
}

// ────────────────────────────────
// AUTH (NextAuth / Auth.js — database session strategy)
// ────────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ────────────────────────────────
// CORE ENTITIES
// ────────────────────────────────

model Branch {
  id        String   @id @default(cuid())
  name      String
  address   String?
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users         User[]
  employees     Employee[]
  motorcycles   Motorcycle[]
  transactions  Transaction[]
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         UserRole
  branchId     String?           // required for CASHIER, null allowed for ADMIN
  employeeId   String   @unique  // mandatory 1-to-1 link — every User must originate from an Employee record
  deletedAt    DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  branch       Branch?      @relation(fields: [branchId], references: [id])
  employee     Employee     @relation(fields: [employeeId], references: [id])
  accounts     Account[]
  sessions     Session[]
  transactions Transaction[] @relation("TransactionCreatedBy")
  auditLogs    AuditLog[]

  @@index([branchId])
}

model Employee {
  id        String   @id @default(cuid())
  name      String
  email     String?
  phone     String?
  address   String?
  branchId  String
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  branch Branch @relation(fields: [branchId], references: [id])
  user   User?  // Prisma back-relation syntax; the Service layer must guarantee this always exists (see BUSINESS_RULE.md Section 11) by creating both records atomically

  @@index([branchId])
}

model Brand {
  id        String   @id @default(cuid())
  name      String
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  motorcycles Motorcycle[]
}

model Category {
  id        String   @id @default(cuid())
  name      String
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  motorcycles Motorcycle[]
}

model Motorcycle {
  id                  String            @id @default(cuid())
  brandId             String
  categoryId          String
  branchId            String
  licensePlate        String            @unique
  chassisNumber       String            @unique
  engineNumber        String            @unique
  mileage             Int
  taxExpiration       DateTime?
  purchasePrice       Decimal
  openPrice           Decimal
  sellingPrice        Decimal
  color               String?
  originalPartsInfo   String?
  instagramLink       String?
  operationalStatus   OperationalStatus @default(AVAILABLE)
  salesStatus         SalesStatus       @default(AVAILABLE)
  deletedAt           DateTime?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  brand             Brand              @relation(fields: [brandId], references: [id])
  category          Category           @relation(fields: [categoryId], references: [id])
  branch            Branch             @relation(fields: [branchId], references: [id])
  images            MotorImage[]
  transactionItems  TransactionItem[]

  @@index([branchId])
  @@index([salesStatus])
  @@index([operationalStatus])
}

model MotorImage {
  id           String   @id @default(cuid())
  motorcycleId String
  path         String   // relative file path in server storage, per BUSINESS_RULE.md 5.1
  isMain       Boolean  @default(false)
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())

  motorcycle Motorcycle @relation(fields: [motorcycleId], references: [id], onDelete: Cascade)

  @@index([motorcycleId])
}

model Customer {
  id        String   @id @default(cuid())
  name      String
  phone     String?
  email     String?
  address   String?
  deletedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[]
}

model Transaction {
  id                String            @id @default(cuid())
  transactionNumber String            @unique  // e.g. TRX-20260707-00001
  branchId          String
  customerId        String
  status            TransactionStatus
  createdById       String
  expiresAt         DateTime?         // only relevant when status = BOOKING
  cancelledAt       DateTime?
  cancelledById     String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  branch     Branch             @relation(fields: [branchId], references: [id])
  customer   Customer           @relation(fields: [customerId], references: [id])
  createdBy  User               @relation("TransactionCreatedBy", fields: [createdById], references: [id])
  items      TransactionItem[]

  @@index([branchId])
  @@index([status])
  @@index([expiresAt])
}

model TransactionItem {
  id             String   @id @default(cuid())
  transactionId  String
  motorcycleId   String
  priceAtSale    Decimal  // snapshot of price at time of transaction
  createdAt      DateTime @default(now())

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  motorcycle  Motorcycle  @relation(fields: [motorcycleId], references: [id])

  @@unique([transactionId, motorcycleId])
  @@index([motorcycleId])
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String   // e.g. "MOTORCYCLE_CREATED", "BOOKING_EXPIRED", "SALE_CANCELLED"
  entityType String   // e.g. "Motorcycle", "Transaction"
  entityId   String
  metadata   Json?    // snapshot/diff, e.g. { before: {...}, after: {...} }
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

## 4. Notes on Key Design Decisions

### 4.1 Why `TransactionItem` instead of a direct `motorcycleId` on `Transaction`

`BUSINESS_RULE.md` Section 6.2 requires one transaction to support multiple motorcycles, and all motorcycles within a transaction move together. A join table (`TransactionItem`) is the correct normalized approach — cancelling a `Transaction` cascades logically (via Service layer, see `ARCHITECTURE.md` Section 5) to every `TransactionItem`'s motorcycle.

### 4.2 Why Booking is not a separate table

Introducing a separate `Booking` table would duplicate `transactionNumber`, `customerId`, `branchId`, etc., and risk drift between "booking" and "transaction" logic — exactly the kind of inconsistency flagged in the old system's analysis. A `BOOKING`-status `Transaction` with an `expiresAt` field is sufficient and keeps Section 7.2's status mapping as the single enforcement point.

### 4.3 Foreign Keys Are Mandatory

Every relation uses a real Postgres foreign key (`@relation`). This directly fixes the old system's "no foreign key constraints" weakness. Deletions on referenced master data must go through soft delete (`deletedAt`), never a hard `DELETE`, to avoid constraint violations and to preserve transaction history per `BUSINESS_RULE.md` Section 15.

### 4.4 `priceAtSale` Snapshot

`Motorcycle.sellingPrice` can change over time (e.g. price adjustments before sale). `TransactionItem.priceAtSale` freezes the price at the moment of the transaction, so historical revenue reports remain accurate even if the motorcycle's listed price is edited later.

### 4.5 Uniqueness Constraints

- `licensePlate`, `chassisNumber`, `engineNumber` are unique — these are physical identifiers that should never collide, matching `BUSINESS_RULE.md` Section 2's "individual assets" principle.
- `transactionNumber` is unique per Section 8.
- `(transactionId, motorcycleId)` is unique on `TransactionItem` — the same motorcycle cannot appear twice in the same transaction.

### 4.6 Indexes

Indexes are added on foreign keys and frequently filtered columns (`branchId`, `salesStatus`, `operationalStatus`, `status`, `expiresAt`) to support the dashboard filters and available-motorcycle search described in `BUSINESS_RULE.md` Sections 6.1 and 12, avoiding the old system's N+1 and full-table-scan issues.

### 4.7 Employee-User Relationship (Resolved)

Per `BUSINESS_RULE.md` Section 11, `User.employeeId` is a **mandatory, unique** 1-to-1 link — every User account must originate from an Employee record. In practice, creating an Employee and creating its linked User account happen together in a single Service-layer transaction (`prisma.$transaction`, see `CODING_STANDARD.md` Section 9), so the two records are never created independently of each other. The Prisma back-relation on `Employee.user` is written as optional (`User?`) only because that's Prisma's required syntax for the non-foreign-key side of a 1-to-1 relation — the Service layer is responsible for guaranteeing it is never actually null in practice.

**Bootstrap note**: The initial seed Admin account (`prisma/seed.ts`, see `ARCHITECTURE.md` Section 13) must also create a corresponding Employee record, so this rule holds even for the very first user in the system.

---

## 5. Booking Expiration Query (Reference)

The scheduled job described in `ARCHITECTURE.md` Section 11 should query:

```sql
SELECT * FROM "Transaction"
WHERE status = 'BOOKING'
  AND "expiresAt" < NOW();
```

For each result, the Booking Service should: set `status = CANCELLED`, `cancelledAt = NOW()`, restore each related `Motorcycle.salesStatus` to `AVAILABLE` (only if `operationalStatus = AVAILABLE`), and write an `AuditLog` entry with `action = "BOOKING_EXPIRED"`.

---

## 6. Migration Strategy

- Prisma Migrate is used (`prisma migrate dev` locally, `prisma migrate deploy` in production per `ARCHITECTURE.md` Section 13).
- Every migration must be reversible in principle (Prisma tracks this automatically); no manual SQL patching outside of Prisma migrations, to avoid the old system's "migration without down()" inconsistency.
- Seed data (initial Admin user, default Branch) is provided via `prisma/seed.ts`, not manual SQL inserts.
