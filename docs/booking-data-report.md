# Booking Data Report

Booking overview data has been organized into the Booking & Journey Core and
Operations Core.

## Working Data Locations

- Booking records: `3-booking-and-journey-core/booking/booking-records.json`
- Booking summary: `3-booking-and-journey-core/booking/booking-summary.json`
- Package usage: `3-booking-and-journey-core/booking/package-usage-summary.json`
- Traveler country/pax summary: `3-booking-and-journey-core/travelers/country-pax-summary.json`
- Payment summary: `3-booking-and-journey-core/payments/payment-summary.json`
- Pickup/dropoff records: `3-booking-and-journey-core/pickup-and-dropoff/pickup-dropoff-records.json`
- Trip readiness records: `4-operations-core/trip-readiness/booking-readiness-records.json`

## Privacy Handling

The working files exclude:

- guest name;
- phone;
- email;
- customer portal link;
- trip media link;
- payment links;
- receipt/reference links;
- expense details;
- profit;
- free-form notes text.

The working files retain operationally useful fields:

- booking id/code;
- order channel;
- package id/name;
- pax;
- trip dates;
- pickup/dropoff details;
- itinerary;
- hotels and rooms;
- t-shirt sizes;
- vehicle assignment;
- driver and guide assignment;
- payment totals and balance status;
- readiness flags.

## Current Booking Set

- Bookings: 74
- Month: August 2026
- Channels:
  - JVTO: 39
  - KLOOK: 26
  - TWT: 9

## Duration Split

- 3D 2N: 30
- 4D 3N: 30
- 2D 1N: 3
- 1D 1N: 4
- 5D 4N: 5
- 1D 0N: 1
- 6D 5N: 1

## Pax Distribution

- 1 pax: 2
- 2 pax: 43
- 3 pax: 4
- 4 pax: 13
- 5 pax: 4
- 6 pax: 2
- 7 pax: 1
- 8 pax: 2
- 9 pax: 1
- 10 pax: 2

## Readiness Signals

- Missing pickup text: 5
- Missing dropoff text: 19
- Missing vehicle assignment: 1
- Missing driver assignment: 1
- Missing guide assignment: 5
- Balance due: 49
- Overpaid/adjustment: 1
- Has internal notes: 26

## Package Usage

| Package ID | Count | Package |
|---:|---:|---|
| 28 | 13 | 3 Day Bromo, Madakaripura Waterfall & Ijen Overland from Surabaya to Bali |
| 84 | 13 | 4D3N Ijen Crater, Papuma Beach, Tumpak Sewu Waterfal & Mount Bromo from Surabaya |
| 82 | 9 | 3D2N Mount Bromo, Madakaripura Waterfall & Ijen Crater Tour from Surabaya |
| 34 | 8 | 4 Day Tumpak Sewu, Bromo & Ijen Adventure from Surabaya to Bali |
| 29 | 5 | 3 Day Ijen, Bromo & Madakaripura Waterfall Discovery from Surabaya |
| null | 5 | 5D 4N Package |
| 33 | 4 | 4 Day Ijen, Papuma Beach, Tumpak Sewu & Bromo Journey from Surabaya |
| 48 | 3 | 2 Day Bromo Sunrise Adventure from Surabaya |
| 83 | 2 | 4D3N Mount Bromo, Ijen Crater & Surabaya Night Market from Surabaya |
| null | 2 | 3D 2N Package |
| 73 | 2 | 1 Day Bromo Midnight Experience from Surabaya |
| 94 | 2 | Mount Bromo Sunrise Private Tour with Photographer from Surabaya |
| 54 | 2 | 4 Day Ijen, Papuma Beach, Tumpak Sewu & Bromo Expedition from Bali to Surabaya |
| 80 | 1 | 3 Day Bromo & Ijen Volcano Discovery from Bali |
| null | 1 | 1D 0N Package |
| null | 1 | 6D 5N Package |
| null | 1 | 4D 3N Package |

## Product Reconciliation Notes

Some booking package IDs are not present in the current public package data:

- 82
- 83
- 84
- 94

These may represent internal, older, channel-specific, retired, draft, or
non-public packages. They should be resolved before booking data is used as a
complete Product & Commercial Core reference.

Some booking records also have `package_id: null` with generic package names.
Those likely need manual mapping or a separate custom-package model.

## Finance Boundary

Booking overview contains expense/profit fields. Those were intentionally not
promoted into working booking files. Internal expense data should be handled
later as a separate finance/operations layer.

