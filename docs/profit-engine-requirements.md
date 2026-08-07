# Profit Engine Requirements

Date: 2026-08-07

Current status: the ecosystem now has public package prices, booking/payment
snapshots, operational route intelligence, booking-level expense summaries,
backoffice profit values, and sanitized detail expense line items for 74
bookings. Profit follows the backoffice `financial.profit` value as-is.

## Minimum Data Needed

### 1. Booking-Level Revenue

Needed per booking:

- booking id/code;
- order channel;
- package id or channel package id;
- travel date;
- pax;
- invoice total;
- paid total;
- outstanding balance;
- refunds/credits/discounts;
- add-on revenue;
- currency;
- exchange rate if not IDR.

Current coverage: available in booking/payment summaries for the current 74
booking snapshot.

### 2. Booking-Level Expense

Needed per booking:

- hotel cost by night/room;
- vehicle cost by day/route;
- driver cost;
- guide/escort/Ijen guide cost;
- jeep cost;
- entrance ticket cost;
- ferry/toll/parking/fuel;
- meals;
- health screening cost;
- T-shirt/merchandise cost;
- add-on fulfillment cost;
- emergency/incident cost;
- supplier invoice/payment status.

Current coverage: available for the current 74 booking snapshot in
`4-operations-core/expense-management/booking-expense-records.json`.

### 3. Channel Cost And Commission

Needed per channel:

- KLOOK commission or net-rate model;
- Traveloka/Tiket/other commission if used;
- TWT commercial arrangement;
- direct website payment gateway fees;
- bank transfer/Wise/card/QRIS fees;
- partner payout timing;
- chargeback/refund fee rules.

Current coverage: channel labels and backoffice profit values exist. Commission
details can still be added later if JVTO wants to explain or audit how the
backoffice profit value is produced.

### 4. Supplier And Rate Master

Needed:

- hotel rate master by hotel/room/season;
- vehicle supplier rates;
- driver/guide rates;
- activity supplier rates;
- destination ticket rates by nationality/weekend/weekday;
- route-based fuel/toll/parking assumptions;
- effective dates;
- owner/review status.

Current coverage: some operational intelligence exists, and actual booking-level
expense line items are now available. Supplier rate master data still needs
owner review for future quotation/pricing use.

### 5. Product Cost Model

Needed per product or channel product:

- canonical package/component map;
- required cost components;
- optional/add-on components;
- pax scaling rule;
- rooming rule;
- vehicle allocation rule;
- guide allocation rule;
- margin target;
- minimum sellable price;
- exception rules.

Current coverage: route/product data exists. KLOOK package IDs 82, 83, and 84
are confirmed as channel-specific; TWT intentionally has no package ID. Package
94 still needs explicit owner confirmation. Some pax/vehicle rules still need
owner confirmation.

### 6. Actual-Vs-Model Calibration

Needed:

- historical bookings with final revenue and final expenses;
- expected cost vs actual cost variance;
- supplier variance;
- channel variance;
- manual adjustment reasons;
- owner approval for final formulas.

The system now stores actual backoffice profit and expense detail. It still
needs actual-vs-model variance review before using the same data for future
pricing recommendations.

## Current Profit Formula

Use the booking overview `financial.profit` value as-is.

The ecosystem also stores `invoiceMinusExpense = invoiceTotal -
overviewExpenseTotal` as a comparison measure only, not as canonical profit.

Current 74-booking snapshot using backoffice profit:

- invoice total: IDR 796,752,000;
- expense total: IDR 622,822,500;
- profit: IDR 23,286,500;
- profit margin: 2.92%.

## What Would Make It Stronger

The profit report is usable now because it follows the backoffice profit value
as-is. It becomes stronger for audit, pricing, and margin explanation after
these are true:

1. every booking has a revenue snapshot;
2. every booking has final or estimated expense lines;
3. every expense line has category, supplier, amount, currency, date, and booking
   reference;
4. every package/channel package maps to a cost model;
5. every cost model has confidence status and owner review;
6. channel commission/payment fees are available as separate breakdown fields if
   not already embedded in the backoffice value;
7. refunds, credits, overpayments, and adjustments are available as separate
   breakdown fields if needed;
8. actual-vs-estimated variance can be audited.

## Most Useful Next Source

The internal expense endpoint has now been used:

`/finance/expense-manager/{booking_id}/internal/api`

The most useful next sources are:

- KLOOK/TWT commission or net-rate rules if JVTO wants explainability;
- payment gateway fee rules if not already included in backoffice profit;
- refund/credit/overpayment handling notes if not already included;
- supplier payment status and final actual-cost confirmation.
