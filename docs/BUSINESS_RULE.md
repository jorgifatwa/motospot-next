# BUSINESS RULE

## 1. Introduction

### 1.1 Purpose

RNJ Motospot is a motorcycle dealership management system designed to manage motorcycle inventory, sales transactions, customer bookings, and operational data for one or multiple dealership branches.

The system focuses on simplifying daily dealership operations while ensuring data consistency and preventing duplicate sales.

This document defines the business rules only. It does not describe technical implementation.

### 1.2 Scope Clarification

The application manages motorcycles as **individual assets**, not as stock quantity.

- Each motorcycle represents one physical unit.
- A motorcycle can only be sold once (per active lifecycle — see Section 5).
- There is no stock quantity and no stock in/out process. This is intentional and must not be reintroduced in future iterations.
- Motorcycles are tracked individually using their own identifying information (license plate, engine number, chassis number, etc.).

---

## 2. User Roles

The application supports Role-Based Access Control (RBAC).

### 2.1 Administrator

Administrator has full access to every module.

Responsibilities:

- Manage users
- Manage roles and permissions
- Manage master data (Brand, Category, Branch)
- Manage motorcycles across **all branches**
- Manage transactions across **all branches**
- Manage bookings across **all branches**
- View dashboard (all branches or filtered)
- Configure system settings (e.g. booking expiration duration)

### 2.2 Cashier

Cashier is responsible only for sales activities, **scoped to their assigned branch**.

Responsibilities:

- Create transaction (motorcycles from their own branch only)
- Create booking (motorcycles from their own branch only)
- View available motorcycles in their own branch
- View transaction history for their own branch

Restrictions:

- Cashier cannot manage system configuration or master data.
- Cashier cannot view, create, or modify transactions belonging to another branch.
- Every Cashier account must be linked to exactly one branch.

---

## 3. Branch Management

- The dealership may have multiple branches.
- Every motorcycle belongs to exactly one branch.
- Every transaction belongs to the same branch as the motorcycle(s) being sold.
- A transaction cannot mix motorcycles from different branches.
- Dashboard reports can be filtered by branch.

---

## 4. Motorcycle Lifecycle

Every motorcycle has **two independent statuses**. Only one definition of each applies — this replaces any earlier conflicting drafts.

### 4.1 Operational Status

Describes the physical condition of the motorcycle.

| Status        | Meaning                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `AVAILABLE`   | The motorcycle is physically ready for sale.                                |
| `MAINTENANCE` | The motorcycle is temporarily unavailable due to maintenance or inspection. |

### 4.2 Sales Status

Describes whether the motorcycle can be purchased.

| Status      | Meaning                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AVAILABLE` | The motorcycle has never been sold and is not currently booked.                                                                                             |
| `BOOKED`    | The motorcycle has been reserved by a customer. It cannot be booked or sold to anyone else.                                                                 |
| `SOLD`      | The motorcycle has been sold. It can never participate in another transaction, unless the sale is explicitly cancelled by an Administrator (see Section 8). |

### 4.3 Interaction Between Operational Status and Sales Status

These two statuses are independent but must never be combined in a way that violates business logic:

- A motorcycle with Operational Status `MAINTENANCE` **cannot** be booked or sold, regardless of its Sales Status.
- A motorcycle with Sales Status `SOLD` cannot have its Operational Status changed back to a sellable state through this mechanism — it is out of the sales pool entirely.
- Sales Status `AVAILABLE` requires Operational Status `AVAILABLE` to actually appear in the sellable motorcycle list.

---

## 5. Motorcycle Data

Each motorcycle stores information such as:

- Brand
- Category
- Branch
- License Plate
- Chassis Number
- Engine Number
- Mileage
- Tax Expiration
- Purchase Price
- Open Price
- Selling Price
- Color
- Original Parts Information
- Instagram Link
- Main Image
- Gallery Images

Motorcycle data supports soft deletion. Deleted motorcycles must not disappear from historical transactions.

### 5.1 Image Upload Rules

- Each motorcycle has exactly **one Main Image** (cover/thumbnail) and **zero or more Gallery Images**.
- There is no maximum limit on the number of Gallery Images per motorcycle — the user may upload as many as needed.
- Images are stored in **server-side file storage** (e.g. local disk or object storage), not in the database.
- The database only stores the **file path** (or URL) referencing the stored image, never the binary image data itself.
- Each Gallery Image record must reference the motorcycle it belongs to (one motorcycle → many gallery image paths).
- When a motorcycle is soft-deleted, its image paths must remain intact so historical transactions can still display the correct images.
- Physical image files should not be hard-deleted from storage as long as any historical transaction references that motorcycle, to preserve audit/history integrity.

---

## 6. Sales Transaction

A transaction represents one customer purchasing one or more motorcycles **from the same branch**.

### 6.1 General Flow

1. User searches available motorcycles (Operational Status `AVAILABLE` and Sales Status `AVAILABLE`).
2. User selects one or more motorcycles into a cart.
3. User enters customer information.
4. User selects transaction status (`SALE` or `BOOKING`).
5. System validates the transaction (see Section 9 — Data Integrity Rules).
6. Transaction is saved, generating a unique transaction number.
7. Each motorcycle's Sales Status is updated automatically according to Section 7 (Status Mapping).

### 6.2 Multi-Motorcycle Transactions

- A transaction may contain multiple motorcycles.
- All motorcycles in a single transaction move through status changes **together** — there is no partial state within one transaction (e.g. one motorcycle `SOLD` while another in the same transaction remains `BOOKED`).
- Cancelling a transaction cancels it **for all motorcycles included in that transaction**. Partial cancellation (cancelling only some motorcycles within a transaction) is not supported; if a customer wants to cancel only part of a purchase, the original transaction must be cancelled and a new transaction created for the remaining motorcycles.

---

## 7. Transaction Status and Status Mapping

### 7.1 Transaction Status

| Status      | Meaning                               |
| ----------- | ------------------------------------- |
| `SALE`      | Customer has completed the purchase.  |
| `BOOKING`   | Customer reserves the motorcycle(s).  |
| `CANCELLED` | The reservation or sale is cancelled. |

### 7.2 Status Mapping (Transaction → Motorcycle Sales Status)

To avoid confusion between transaction-level status and motorcycle-level status, the mapping is fixed as follows:

| Transaction Status | Motorcycle Sales Status |
| ------------------ | ----------------------- |
| `SALE`             | `SOLD`                  |
| `BOOKING`          | `BOOKED`                |
| `CANCELLED`        | `AVAILABLE` (restored)  |

This mapping is authoritative. No other combination is valid.

---

## 8. Transaction Number

- Every transaction must have a human-readable transaction number.
- Transaction numbers must be unique.
- The transaction number must not expose the database primary key.
- Recommended format: `TRX-YYYYMMDD-00001` (example: `TRX-20260707-00001`).

Transaction numbers are used for:

- Searching transactions
- Printing invoices
- Customer communication
- Audit trail

---

## 9. Booking

Booking is a temporary reservation made by a customer before completing the purchase.

### 9.1 Business Rules

- A motorcycle can only have one active booking at a time.
- A booked motorcycle cannot be sold to another customer.
- A booked motorcycle cannot be booked again by a different customer.
- **Cashier may convert a booking into a completed sale**, restricted to bookings belonging to their own branch.
- Administrator may also convert any booking into a completed sale, across all branches.
- Administrator may cancel a booking. Cashier may cancel a booking belonging to their own branch.
- Cancelling a booking restores the motorcycle's Sales Status to `AVAILABLE`, provided its Operational Status is `AVAILABLE`.

### 9.2 Booking Expiration

- Every booking must have an expiration date.
- The default expiration period is **7 days (1 week)** from the moment the booking is created.
- The expiration period must be configurable by the Administrator (system setting, not hardcoded) — the 7-day value is the default, not a fixed constant.
- If a booking expires before being converted into a sale, the system automatically cancels the booking and restores the motorcycle's Sales Status to `AVAILABLE`.
- Automatic cancellation must be recorded in the audit log (see Section 11).

---

## 10. Customer

- Customer information is stored separately from transactions.
- One customer may have multiple transactions.
- Deleting customer data must not remove transaction history (soft delete only).

---

## 11. Employee

- Every Employee **automatically has a linked User login account**, created at the same time the Employee record is created.
- The person creating an Employee record must also supply the account's role (Administrator or Cashier) and an initial password (or the system generates a temporary one that must be changed on first login).
- Employee data (name, email, phone, address, branch assignment) and login credentials are stored separately (Employee vs User tables), but the relationship between them is **mandatory, not optional** — a User account cannot exist without a corresponding Employee record, and every Employee has exactly one User account.
- Deactivating/removing an Employee (soft delete) must also deactivate the linked User account so the person can no longer log in.

---

## 12. Dashboard

Dashboard provides business summary. Displayed information includes:

- Total motorcycles
- Available motorcycles (Operational `AVAILABLE` + Sales `AVAILABLE`)
- Motorcycles under maintenance
- Booked motorcycles
- Sold motorcycles
- Total sales
- Monthly revenue
- Yearly revenue

Reports can be filtered by branch.

---

## 13. Audit Trail

Every important business action must be recorded, including but not limited to:

- Login / Logout
- Motorcycle created / updated / deleted
- Booking created / updated / expired (auto-cancelled)
- Sale completed
- Sale or booking cancelled (manual, by whom)

Audit history must never be editable or deletable.

---

## 14. Data Integrity Rules

Rules that must always be enforced at the system level:

1. A motorcycle cannot exist in more than one branch.
2. A motorcycle cannot be sold twice while in `SOLD` status.
3. A booked motorcycle cannot be booked again while in `BOOKED` status.
4. A motorcycle with Operational Status `MAINTENANCE` cannot be booked or sold.
5. Cancelled transactions restore motorcycle Sales Status to `AVAILABLE` for every motorcycle included in that transaction.
6. Deleting master data (Brand, Category, Branch) must not break existing transaction history — use soft delete.
7. Every transaction must belong to exactly one customer.
8. Every transaction must belong to exactly one branch; all motorcycles in the transaction must belong to that same branch.
9. Every motorcycle must belong to exactly one brand, one category, and one branch.
10. Every booking must have an expiration date.
11. Only one active booking is allowed per motorcycle at any given time.
12. Transaction numbers must always be unique.
13. Sales Status and Operational Status are independent but must never contradict the rules in Section 4.3.

---

## 15. Soft Delete Policy

- Master data (Brand, Category, Branch, Motorcycle, Customer) uses soft delete whenever historical references exist.
- Historical transactions must remain valid and readable even after related master data is soft-deleted.
- Hard delete is not permitted on any entity referenced by a transaction.

---

## 16. Future Scalability

The architecture should allow future implementation of the following without requiring major architectural changes:

- Notification system
- Payment integration
- Digital invoice
- Multi-company support
- Cloud image storage
- Mobile application
- Public motorcycle catalog

---

## 17. Open Decisions (to confirm before ARCHITECTURE.md / DATABASE.md)

The following points are flagged as needing an explicit decision, since the original draft left them ambiguous:

1. ~~**Booking → Sale conversion permission**~~ — **Resolved**: Cashier may convert bookings to sales and cancel bookings within their own branch; Administrator may do so across all branches (see Section 9.1).
2. ~~**Booking expiration default value**~~ — **Resolved**: default expiration period is **7 days (1 week)** from booking creation, configurable by the Administrator (see Section 9.2).
3. ~~**Employee-to-User linkage**~~ — **Resolved**: mandatory 1-to-1 link. Every Employee automatically gets a User login account at creation time; a User cannot exist without a corresponding Employee (see Section 11).
