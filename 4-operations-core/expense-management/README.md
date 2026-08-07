# Expense Management

This folder contains sanitized booking-level expense records fetched from the
internal expense manager endpoint.

Available data:

- `booking-expense-records.json`

Current coverage:

- 74 booking expense records;
- accommodation, destination, vehicle, crew, other, and add-on expense line
  items;
- booking overview expense totals;
- profit using backoffice `financial.profit` as-is;
- comparison field `invoiceMinusExpense` using `invoiceTotal - overviewExpenseTotal`.

Important note:

Profit follows the backoffice value as-is. The `invoiceMinusExpense` field is
kept only as a comparison measure, not as canonical profit.

Not stored here:

- customer names;
- customer phone numbers;
- customer emails;
- payment links;
- customer portal URLs;
- raw source payloads.
