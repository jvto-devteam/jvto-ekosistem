# JVTO Ecosystem Pain Points Audit

Audit date: 2026-08-07

This audit reviews the current `/Users/macbook/Code/jvto-ekosistem` workspace as
an operating data system, not only as a folder inventory.

## Executive Summary

The five-core structure is aligned with the original GPT operating-ecosystem
direction, and the active dataset is no longer empty. The main pain points are
not folder naming problems. They are operating-readiness gaps:

1. channel-specific product IDs need an explicit mapping/annotation layer;
2. public deployment exposes operational booking-level data;
3. channel mapping is incomplete, especially KLOOK/TWT;
4. profit uses the backoffice value as-is, while commission/fee/refund details
   are still useful for explainability;
5. lifecycle, quotation, communication, review, incident, and true event logs are
   missing;
6. schemas exist but are not yet enforced by a validation/build gate.

## P0 Pain Points

### 1. Channel-Specific Package IDs Need Explicit Mapping

Current data:

- `3-booking-and-journey-core/booking/booking-records.json` has 74 booking
  records.
- `2-product-and-commercial-core/tour-products` has 17 active product contracts.
- 26 booking records use channel-specific KLOOK package IDs:
  - package `84`: 13 bookings;
  - package `82`: 9 bookings;
  - package `83`: 2 bookings;
  - package `94`: 2 bookings, observed in KLOOK records and still needs explicit
    owner confirmation.
- The user confirmed package IDs `82`, `83`, and `84` are KLOOK package IDs, not
  missing JVTO direct product contracts.
- The user confirmed TWT intentionally does not use package IDs.
- 10 additional bookings are TWT/custom/generic package records with
  `packageId: null`.

Impact:

- This is not a folder/data-entry mistake.
- The gap is that partner/channel package IDs are not yet formally mapped to
  JVTO direct product contracts or marked as standalone channel products.
- Booking, ops, guest portal, analytics, and partner channel outputs can
  summarize the records, but they cannot yet express the relationship between
  direct products and channel-specific products.

Recommended decision:

- Keep KLOOK/TWT IDs as they are.
- Add/maintain a `channel-product-map` layer:
  - `82`, `83`, `84` = confirmed KLOOK package IDs;
  - `94` = observed KLOOK package ID, pending owner confirmation;
  - TWT/packageId `null` = intentional custom/generic package behavior.

### 2. Public Explorer Exposes Operational Booking-Level Data

The domain currently displays all project files, including booking-level and
operations-level JSON.

Active files containing booking or operational identifiers include:

- `3-booking-and-journey-core/booking/booking-records.json`
- `3-booking-and-journey-core/booking/customer-portal-booking-details.json`
- `3-booking-and-journey-core/payments/payment-summary.json`
- `3-booking-and-journey-core/pickup-and-dropoff/pickup-dropoff-records.json`
- `4-operations-core/crew-assignment/crew-assignment-records.json`
- `4-operations-core/hotel-and-partner-confirmation/hotel-confirmation-records.json`
- `4-operations-core/trip-readiness/booking-readiness-records.json`
- `5-experience-engine/guest-portal/customer-portal-detail-records.json`
- `5-experience-engine/guest-portal/guest-portal-records.json`
- `5-experience-engine/ops-console/ops-console-records.json`
- `5-experience-engine/partner-feed/channel-booking-summary.json`

The data is sanitized from direct customer names, phone numbers, emails, and raw
conversation bodies, but it still includes combinations of:

- booking IDs/codes;
- guest IDs;
- trip dates;
- pickup/dropoff detail;
- crew assignments;
- hotel assignments;
- payment totals and balance status.

Impact:

- This is fine for an internal knowledge workspace.
- It is risky as a public internet page unless the boss explicitly wants
  operational data exposed.

Recommended decision:

- Split the explorer into:
  - public published knowledge;
  - internal operating data.
- Add basic auth or restrict internal folders if the subdomain remains online.

## P1 Pain Points

### 3. Channel Availability Needs Mapping Semantics

Current product contracts generally expose JVTO direct availability, while the
booking snapshot contains:

- 39 JVTO bookings;
- 26 KLOOK bookings;
- 9 TWT bookings.

KLOOK bookings in the current snapshot use channel-specific package IDs:

- KLOOK package `84`: 13 bookings;
- KLOOK package `82`: 9 bookings;
- KLOOK package `83`: 2 bookings;
- KLOOK package `94`: 2 bookings.

TWT bookings are mostly generic/custom package records with no package ID, which
the user confirmed is intentional.

Impact:

- Partner bookings are operationally real and intentionally channel-specific.
- Partner feed and ops readiness can summarize the bookings, but cannot yet
  explain whether each channel package maps to a direct product, a channel-only
  product, or a custom package template.

Recommended decision:

- Create `channel-product-map` records that map partner package IDs to canonical
  JVTO product contracts or mark them explicitly as channel-only/custom.

### 4. Operational Readiness Gaps Are Real, Not Cosmetic

From the 74 booking records:

- 49 bookings have `balance_due`;
- 36 bookings have no payment history;
- 19 bookings have missing/incomplete dropoff;
- 5 bookings have missing pickup;
- 5 bookings have missing guide;
- 5 bookings have missing hotel assignment;
- 1 booking has missing vehicle;
- 1 booking has missing driver;
- 10 bookings have missing customer country.

Impact:

- Ops Console output is useful, but it is currently snapshot-based.
- The system cannot yet distinguish "not entered yet", "not required",
  "partner-managed", "pending confirmation", and "data error" consistently.

Recommended decision:

- Add explicit readiness states per field:
  - `missing`;
  - `not_required`;
  - `partner_managed`;
  - `pending_guest`;
  - `pending_ops`;
  - `confirmed`;
  - `unknown`.

### 5. Expense And Profit Data Exists

The strongest profit-related files are:

- `2-product-and-commercial-core/pricing-rules/cost-components.json`
- `4-operations-core/expense-management/booking-expense-records.json`
- `5-experience-engine/analytics/profitability-summary.json`

The booking overview already carries expense summary fields for all 74 bookings,
and the internal expense detail endpoint now provides line-item details that
match the overview expense total exactly.

Per owner instruction, profit uses the booking overview `financial.profit` value
as-is. The ecosystem keeps `invoiceMinusExpense` only as a comparison measure,
not as the canonical profit number.

Current 74-booking snapshot:

- invoice total: IDR 796,752,000;
- expense total: IDR 622,822,500;
- profit: IDR 23,286,500;
- profit margin: 2.92%;
- invoice minus expense comparison: IDR 173,929,500;
- invoice minus expense margin: 21.83%.

By channel:

- JVTO: 39 bookings, profit IDR -39,723,000, margin -9.47%;
- KLOOK: 26 bookings, profit IDR 43,096,000, margin 19.56%;
- TWT: 9 bookings, profit IDR 19,913,500, margin 12.68%.

Impact:

- The ecosystem can now support a first profit dashboard from real booking and
  expense data.
- It can report profit by channel/package using the backoffice definition.
- It cannot yet fully explain every component behind the profit number if
  commission, payment fee, refund/credit, overpayment, or supplier-payment
  handling is not represented separately.

Recommended decision:

- Use `financial.profit` as the canonical profit field.
- Keep `invoiceMinusExpense` as an audit/comparison field.
- Add KLOOK/TWT commission/net-rate rules and payment-fee/refund notes only if
  JVTO wants deeper profit explainability.

## P2 Pain Points

### 6. Vehicle/Pax Rule Conflict Still Needs One Owner Decision

File:

- `2-product-and-commercial-core/luggage-and-pax-rules/vehicle-rooming-pax-rules.json`

Current conflict:

- one source says `1-3 guests -> AC MPV`;
- another says `2-3 guests -> 1 x MPV`;
- the file is correctly marked `reviewStatus: needs_canonical_review`.

Impact:

- Product pages, quotation, invoice, operations brief, and guest prep can drift
  if this is not resolved.

Recommended decision:

- Owner should publish one canonical pax/vehicle/luggage rule and mark the
  previous rule as legacy/source evidence.

### 7. Lifecycle Model Exists But Is Not Backed By History

Present:

- `3-booking-and-journey-core/lifecycle-status/booking-flow.json`
- `3-booking-and-journey-core/lifecycle-status/status-flow.json`

Missing:

- timestamped booking state history;
- actor;
- before/after state;
- event payload;
- reason/notes.

Impact:

- The system can describe intended lifecycle states.
- It cannot yet reconstruct how a booking moved through the journey.

Recommended decision:

- Export or implement a true event log before building automation triggers.

### 8. Communication, Quotation, Review, Incident, And AI Evaluation Data Are Missing

Current folders document the gap but do not contain real records:

- `3-booking-and-journey-core/quotation`
- `3-booking-and-journey-core/communication-log`
- `3-booking-and-journey-core/review-request`
- `4-operations-core/incident-log`
- `5-experience-engine/ai-answers`

Impact:

- Sales copilot, operations copilot, review automation, and AI answer evaluation
  cannot be measured end-to-end yet.

Recommended decision:

- Add exports for:
  - inquiry/prospect records;
  - quotation revisions;
  - message summaries/template send logs;
  - review request lifecycle;
  - incident/resolution log;
  - AI retrieval/evaluation payloads.

### 9. Schemas Exist, But There Is No Build Gate

Present:

- `schemas/*.schema.json`
- examples in `schemas/examples`

Missing:

- validation script;
- CI/build gate;
- schema coverage for every active dataset;
- failure policy when required data is missing.

Impact:

- The project can be read by humans.
- It is not yet guarded against accidental drift.

Recommended decision:

- Add a `validate` script that checks JSON syntax, required contract fields,
  internal refs, sensitive field policy, and schema compliance.

## What Is Working Well

- The five-core structure is aligned with the original GPT operating ecosystem.
- There are no empty active folders.
- Active JSON is syntactically valid.
- Internal path references are healthy: 261 checked internal refs, 0 missing.
- Product/pricing/itinerary/channel/website-output counts are aligned for the
  17 current active product contracts.
- Knowledge JSON now carries `owner`, `lastReviewed`, and `reviewStatus`.

## Recommended Next Step

The highest-leverage next move is not adding more folders. It is resolving the
product-channel-booking reconciliation:

1. decide what package IDs `82`, `83`, `84`, and `94` are;
2. map or create contracts for them;
3. classify `packageId: null` bookings;
4. add channel mapping for KLOOK and TWT;
5. separate public knowledge from internal operating data on the deployed
   explorer.
