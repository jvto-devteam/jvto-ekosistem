# Checkout And Portal Data Report

Sources checked:

- `https://javavolcano-touroperator.com/tours/from-surabaya/bromo-madakaripura-ijen-3d2n`
- `https://javavolcano-touroperator.com/checkout`
- `/Users/macbook/Code/jvto-web/src/components/website/TourDetail.tsx`
- `/Users/macbook/Code/jvto-web/src/app/(website)/checkout/CheckoutInner.tsx`
- `/Users/macbook/Code/jvto-web/src/app/(api)/api/checkout/route.ts`
- `https://legacy.javavolcano-touroperator.com/bookings/details/{portal_slug}?json=true`

## Data Added

### Inquiry

- `3-booking-and-journey-core/inquiry/website-tour-to-checkout-flow.json`

This records the structured intake flow from tour detail to checkout: date, pax,
add-ons, blocked dates, checkout contact fields, ISIC verification, payment
rules, and legacy checkout payload fields.

### Booking And Journey

- `3-booking-and-journey-core/booking/customer-portal-booking-details.json`
- `3-booking-and-journey-core/pickup-and-dropoff/customer-portal-logistics.json`

These records summarize 74 customer portal payloads without customer names,
contact details, portal slugs, payment links, media links, or uploaded proof
URLs.

### Product And Commercial

- `2-product-and-commercial-core/routes-and-itineraries/customer-portal-itinerary-records.json`

This records actual itinerary days from customer portal payloads.

### Operations

- `4-operations-core/hotel-and-partner-confirmation/customer-portal-accommodation-records.json`
- `4-operations-core/crew-assignment/customer-portal-crew-records.json`
- `4-operations-core/vehicle-assignment/customer-portal-vehicle-records.json`

These records capture actual portal-visible hotel, crew, and vehicle assignment
details.

### Experience Engine

- `5-experience-engine/guest-portal/customer-portal-detail-records.json`
- `5-experience-engine/knowledge-feed/customer-portal-faq-packing-feed.json`

These records capture sanitized guest portal detail and compiled portal
FAQ/packing/checklist content.

## Archive

Raw fetched portal payloads are stored only in:

- `archive/customer-portal-detail-snapshot/`

## Privacy Handling

The active ecosystem files exclude:

- customer names;
- customer IDs;
- phone numbers and emails;
- portal access slugs;
- payment links and uploaded payment proof URLs;
- media links;
- payment references.

