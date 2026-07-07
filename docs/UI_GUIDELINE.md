# UI GUIDELINE

## 1. Purpose

This document defines the visual design system for RNJ Motospot V2. The direction is **Bold & Modern** — strong contrast, confident use of the brand's red/black identity, not a generic admin-template look (unlike the old AdminLTE-based UI). This document is authoritative for colors, typography, spacing, and component styling; `ARCHITECTURE.md` defines where components live technically.

---

## 2. Brand Foundation

Derived from the RNJ Motospot logo (red/black motorcycle mark):

| Token                    | Hex       | Usage                                                                         |
| ------------------------ | --------- | ----------------------------------------------------------------------------- |
| `--color-brand-red`      | `#D9272E` | Primary brand color — logo, primary buttons, active nav state, key highlights |
| `--color-brand-red-dark` | `#A81E23` | Hover/pressed state for primary actions                                       |
| `--color-ink`            | `#1A1A1A` | Near-black from logo — headings, primary text, dark surfaces                  |
| `--color-ink-soft`       | `#3D3D3D` | Secondary text on light backgrounds                                           |

**Rule**: `--color-brand-red` is reserved for brand identity and primary actions (main CTA buttons, active states, logo accents). It must **not** be reused as a status color (see Section 4) to avoid ambiguity between "this is a primary action" and "this motorcycle is sold."

---

## 3. Neutral Scale

| Token                 | Hex       | Usage                                            |
| --------------------- | --------- | ------------------------------------------------ |
| `--color-bg`          | `#FFFFFF` | Base page background                             |
| `--color-surface`     | `#F7F7F8` | Card/panel background                            |
| `--color-surface-alt` | `#EFEFF1` | Table row alternation, subtle section separation |
| `--color-border`      | `#E2E2E5` | Dividers, input borders                          |
| `--color-text-muted`  | `#6B6B70` | Placeholder text, secondary labels               |

Dark mode is not required at launch, but tokens should be named semantically (not `gray-100`) so a dark theme can be added later without renaming variables — aligned with `BUSINESS_RULE.md` Section 16 (Future Scalability).

---

## 4. Status Colors

Status colors must be **visually distinct from `--color-brand-red`** and from each other, following bold/high-contrast direction:

| Status                   | Token                        | Hex                    | Meaning                                                                                     |
| ------------------------ | ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| Operational: Available   | `--color-status-ok`          | `#16A34A` (green)      | Motorcycle physically ready                                                                 |
| Operational: Maintenance | `--color-status-maintenance` | `#F59E0B` (amber)      | Under maintenance                                                                           |
| Sales: Available         | `--color-status-ok`          | `#16A34A` (green)      | Same as operational-available — reuse token                                                 |
| Sales: Booked            | `--color-status-booked`      | `#2563EB` (bold blue)  | Reserved by a customer                                                                      |
| Sales: Sold              | `--color-status-sold`        | `#1A1A1A` (ink/black)  | Terminal state — deliberately neutral-dark instead of red, to avoid clashing with brand red |
| Transaction: Cancelled   | `--color-status-cancelled`   | `#6B6B70` (muted gray) | De-emphasized, no longer active                                                             |

Status is always shown as a **badge/chip** (bold fill, white text) — never conveyed by color alone; always paired with a text label for accessibility.

---

## 5. Typography

| Token            | Font                                                                     | Usage                                                                              |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `--font-display` | A bold, geometric sans-serif (e.g. "Inter" at 700/800 weight, or "Sora") | Page titles, dashboard KPI numbers, section headers — this carries the "bold" feel |
| `--font-body`    | "Inter" 400/500                                                          | Body text, table content, form labels                                              |

| Scale   | Size | Weight  | Usage                                           |
| ------- | ---- | ------- | ----------------------------------------------- |
| Display | 32px | 800     | Dashboard headline numbers (e.g. total revenue) |
| H1      | 24px | 700     | Page title                                      |
| H2      | 18px | 700     | Section/card title                              |
| Body    | 14px | 400–500 | Default UI text                                 |
| Caption | 12px | 500     | Table meta, timestamps, helper text             |

Numbers in dashboard KPIs and prices should use **tabular figures** (`font-variant-numeric: tabular-nums`) so digits align in tables and cards.

---

## 6. Spacing & Layout

- Base spacing unit: `4px`. Use multiples (4, 8, 12, 16, 24, 32, 48) — no arbitrary pixel values.
- Cards/panels use generous internal padding (`24px`) to reinforce a confident, uncluttered feel despite the bold color use — bold does not mean cramped.
- Max content width for dashboard pages: `1440px`, centered, with a persistent left sidebar (see Section 8).

---

## 7. Component Direction (Bold & Modern)

- **Buttons**: Solid fill for primary actions using `--color-brand-red`, fully rounded corners (`border-radius: 8px`, not pill-shaped — bold but structured, not playful). Hover state darkens to `--color-brand-red-dark`. Secondary buttons use an outlined ink border on white.
- **Cards**: Flat design, no heavy drop shadows — use a `1px` border (`--color-border`) plus a subtle `box-shadow` only on hover/interactive cards, not static ones.
- **Tables**: Bold header row (`--color-ink` background, white text, uppercase small caption-size labels), zebra-striped body rows using `--color-surface-alt`.
- **Status badges**: Solid fill (not pastel/outline) per Section 4 — this is where "bold" shows up most, since status is glanceable information dealers check constantly.
- **Forms**: Clear label above input (not placeholder-only labels, to avoid the old system's inconsistent validation UX). Input focus state uses a 2px `--color-brand-red` ring.
- **Empty/loading states**: Every list/table must have an explicit loading skeleton and empty state illustration/message — this directly fixes the old system's "no loading state" weakness.

---

## 8. Navigation Structure

- Persistent left sidebar (dark `--color-ink` background, not default AdminLTE blue/gray) with the brand red used only for the active menu item indicator and logo mark — this is the primary place the "bold" identity shows structurally.
- Top bar: minimal — branch selector (for Admin), user menu, notifications placeholder for future scalability.
- No nested multi-level dropdown sidebar menus beyond 2 levels, to avoid the old system's cluttered navigation tree (Dashboard / Kelola Akun / Master Data / Transaksi, etc. — consolidate into flatter groups where possible, to be finalized during actual sidebar implementation).

---

## 9. Motorcycle Card / Gallery Display

Since Motorcycle is the central entity:

- Motorcycle list/grid view uses a card with the **Main Image** prominent (per `BUSINESS_RULE.md` Section 5.1), status badge overlaid top-right corner of the image, price in bold display typography.
- Detail page gallery uses a primary image + thumbnail strip below (supports unlimited gallery images per `BUSINESS_RULE.md` 5.1, so the thumbnail strip must scroll/paginate, not expand infinitely).

---

## 10. Accessibility

- Minimum contrast ratio 4.5:1 for body text against its background — verify `--color-brand-red` on white (passes at `#D9272E`) and white text on brand red (verify at final implementation, adjust weight/size if needed for small text).
- All interactive elements must have visible focus states (not removed via `outline: none` without replacement).
- Status must never rely on color alone (Section 4) — always paired with text/icon.

---

## 11. Cross-References

- Component technical placement (`components/ui` vs `components/shared`) is defined in `ARCHITECTURE.md` Section 4.
- Status values themselves (`AVAILABLE`, `BOOKED`, `SOLD`, etc.) are defined in `BUSINESS_RULE.md` Section 4 and `DATABASE.md` Section 3 (enums) — this document only defines how they are _displayed_, not their business meaning.
