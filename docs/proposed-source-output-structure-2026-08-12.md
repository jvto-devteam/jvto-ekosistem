# Proposed JVTO Source and Output Structure

Tanggal rancangan: 2026-08-12

Status: superseded.

Catatan: proposal ini dibuat sebelum keputusan final. Keputusan final yang dipakai untuk implementasi adalah `docs/cms-source-render-architecture-decision-2026-08-12.md`: source editable tetap berada di 5 folder ekosistem awal sebagai `*.source.json`, bukan di folder `content-source/` terpisah.

## Prinsip

Struktur ini mengikuti konsep:

- satu objek besar = satu tempat edit untuk manusia/Tina CMS;
- satu source bisa menghasilkan banyak output;
- generated output tidak diedit manual;
- archive tetap read-only dan tidak masuk CMS.

## Tree target

```text
jvto-ekosistem/
  README.md
  package.json
  server.mjs

  content-source/
    README.md
    _source-registry.json
    _cms-permissions.json
    _review-ownership.json

    organization/
      organization.source.json
      credentials.source.json
      partners.source.json
      review-platforms.source.json

    people/
      people-and-crew.source.json
      crew-aliases.source.json
      crew-public-profiles.source.json

    destinations/
      index.source.json
      mount-bromo.source.json
      ijen-crater.source.json
      tumpak-sewu-waterfall.source.json
      madakaripura-waterfall.source.json
      papuma-beach.source.json
      malang-batu.source.json
      bali.source.json

    travel-guide/
      index.source.json
      booking-information.source.json
      faq.source.json
      ijen-health-screening.source.json
      safety-on-tours.source.json
      packing-and-fitness.source.json
      packing-list.source.json
      best-time-to-visit.source.json
      weather-and-closures.source.json
      police-escort-for-groups.source.json
      rijik-monthly-closure.source.json
      mount-bromo-logistics.source.json
      tumpak-sewu-logistics.source.json
      bromo-sunrise.source.json
      blue-fire-and-sunrise.source.json
      finish-in-bali.source.json
      why-stay-near-ijen.source.json
      vehicle-and-luggage.source.json
      rooming-and-accommodation.source.json
      private-tour.source.json
      what-is-included.source.json
      payment-and-deposit.source.json
      how-booking-works.source.json
      cancellation-travel-credit.source.json

    policies/
      index.source.json
      booking-payment-cancellation.source.json
      inclusions-exclusions.source.json
      privacy.source.json

    why-jvto/
      index.source.json
      the-jvto-difference.source.json
      our-story.source.json
      our-team.source.json
      reviews.source.json
      community-standards.source.json

    verify-jvto/
      index.source.json
      legal.source.json
      police-safety.source.json
      press-recognition.source.json
      history-artifacts.source.json

    reviews/
      reviews.source.json

    tour-packages/
      _package-index.source.json
      _package-shared-rules.source.json
      tours__from-bali__bromo-ijen-3d2n.source.json
      tours__from-bali__ijen-bromo-madakaripura-3d2n.source.json
      tours__from-bali__ijen-papuma-tumpak-sewu-bromo-4d3n.source.json
      tours__from-bali__ijen-papuma-tumpak-sewu-bromo-5d4n.source.json
      tours__from-surabaya__bromo-1d1n.source.json
      tours__from-surabaya__bromo-2d1n.source.json
      tours__from-surabaya__bromo-madakaripura-ijen-3d2n.source.json
      tours__from-surabaya__ijen-2d1n.source.json
      tours__from-surabaya__ijen-bromo-madakaripura-3d2n.source.json
      tours__from-surabaya__ijen-bromo-madakaripura-4d3n.source.json
      tours__from-surabaya__ijen-bromo-madakaripura-malang-5d4n.source.json
      tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-4d3n.source.json
      tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-5d4n.source.json
      tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-malang-6d5n.source.json
      tours__from-surabaya__taman-safari-prigen-bromo-madakaripura-3d2n.source.json
      tours__from-surabaya__tumpak-sewu-bromo-3d2n.source.json
      tours__from-surabaya__tumpak-sewu-bromo-ijen-4d3n.source.json

    commercial-rules/
      deposit-and-balance-rules.source.json
      cancellation-and-credit-rules.source.json
      inclusions-exclusions-baseline.source.json
      luggage-and-pax-rules.source.json
      group-discount-foc.source.json
      add-ons.source.json
      channel-availability-rules.source.json
      health-requirements-by-product.source.json

    operations-rules/
      pickup-dropoff-contexts.source.json
      time-window-rules.source.json
      closure-plan-b-rules.source.json
      road-situation-profiles.source.json
      vehicle-rules.source.json
      crew-assignment-rules.source.json
      accommodation-logic.source.json
      meal-logic.source.json
      guest-meeting-protocol.source.json

    communication/
      whatsapp-templates.source.json
      email-templates.source.json
      invoice-receipt-templates.source.json
      customer-preparation-messages.source.json

    booking-runtime-snapshots/
      README.md
      booking-records.source.json
      payments.source.json
      pickup-dropoff-records.source.json
      travelers.source.json
      health-requirements-by-booking.source.json
      readiness-records.source.json
```

## Experience Engine output tree

```text
  5-experience-engine/
    README.md

    manifests/
      build-manifest.json
      source-output-map.json
      route-output-index.json
      source-hash-index.json
      drift-report.json

    public-website/
      routes.json
      navigation.website-output.json
      sitemap.website-output.json

      pages/
        home.website-output.json

        travel-guide.website-output.json
        travel-guide__booking-information.website-output.json
        travel-guide__faq.website-output.json
        travel-guide__ijen-health-screening.website-output.json
        travel-guide__safety-on-tours.website-output.json
        travel-guide__packing-and-fitness.website-output.json
        travel-guide__packing-list.website-output.json
        travel-guide__best-time-to-visit.website-output.json
        travel-guide__weather-and-closures.website-output.json
        travel-guide__police-escort-for-groups.website-output.json
        travel-guide__rijik-monthly-closure.website-output.json
        travel-guide__mount-bromo-logistics.website-output.json
        travel-guide__tumpak-sewu-logistics.website-output.json

        policy.website-output.json
        policy__booking-payment-cancellation.website-output.json
        policy__inclusions-exclusions.website-output.json
        policy__privacy.website-output.json

        why-jvto.website-output.json
        why-jvto__the-jvto-difference.website-output.json
        why-jvto__our-story.website-output.json
        why-jvto__our-team.website-output.json
        why-jvto__reviews.website-output.json
        why-jvto__community-standards.website-output.json

        verify-jvto.website-output.json
        verify-jvto__legal.website-output.json
        verify-jvto__police-safety.website-output.json
        verify-jvto__press-recognition.website-output.json
        verify-jvto__history-artifacts.website-output.json

        destinations.website-output.json
        destinations__mount-bromo.website-output.json
        destinations__ijen-crater.website-output.json
        destinations__tumpak-sewu-waterfall.website-output.json
        destinations__madakaripura-waterfall.website-output.json
        destinations__papuma-beach.website-output.json

        tours__from-bali__bromo-ijen-3d2n.website-output.json
        tours__from-bali__ijen-bromo-madakaripura-3d2n.website-output.json
        tours__from-bali__ijen-papuma-tumpak-sewu-bromo-4d3n.website-output.json
        tours__from-bali__ijen-papuma-tumpak-sewu-bromo-5d4n.website-output.json
        tours__from-surabaya__bromo-1d1n.website-output.json
        tours__from-surabaya__bromo-2d1n.website-output.json
        tours__from-surabaya__bromo-madakaripura-ijen-3d2n.website-output.json
        tours__from-surabaya__ijen-2d1n.website-output.json
        tours__from-surabaya__ijen-bromo-madakaripura-3d2n.website-output.json
        tours__from-surabaya__ijen-bromo-madakaripura-4d3n.website-output.json
        tours__from-surabaya__ijen-bromo-madakaripura-malang-5d4n.website-output.json
        tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-4d3n.website-output.json
        tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-5d4n.website-output.json
        tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-malang-6d5n.website-output.json
        tours__from-surabaya__taman-safari-prigen-bromo-madakaripura-3d2n.website-output.json
        tours__from-surabaya__tumpak-sewu-bromo-3d2n.website-output.json
        tours__from-surabaya__tumpak-sewu-bromo-ijen-4d3n.website-output.json

      sections/
        homepage-hero.website-output.json
        homepage-featured-tours.website-output.json
        homepage-reviews.website-output.json
        homepage-crew-proof.website-output.json
        footer.website-output.json
        header.website-output.json

    json-ld/
      organization.schema-output.json
      website.schema-output.json
      breadcrumbs.schema-output.json
      reviews.schema-output.json
      travel-guide.schema-output.json
      policies.schema-output.json
      destinations.schema-output.json
      tour-products.schema-output.json

    knowledge-feed/
      public-knowledge-feed.json
      travel-guide-feed.json
      product-feed.json
      review-feed.json
      policy-feed.json
      llms.txt

    partner-feed/
      klook-product-feed.json
      getyourguide-product-feed.json
      channel-product-map.json
      channel-booking-summary.json

    whatsapp-messages/
      checkout-created.output.json
      payment-success.output.json
      payment-reminder.output.json
      trip-information.output.json
      trip-media.output.json
      bali-reminder.output.json
      crew-trip-reminder.output.json

    email-templates/
      new-reservation.output.json
      receipt-attach.output.json
      payment-reminder.output.json
      trip-preparation.output.json

    quotation-and-invoice/
      invoice-template.output.json
      receipt-template.output.json
      quotation-template.output.json
      bank-transfer-payment-page.output.json

    guest-portal/
      guest-portal-definition.output.json
      guest-portal-records.output.json
      customer-portal-detail-records.output.json
      customer-portal-checklist.output.json

    ops-console/
      ops-console-records.output.json
      readiness-exceptions.output.json
      today-departures.output.json
      crew-assignments.output.json

    analytics/
      google-review-insights.output.json
      profitability-summary.output.json
      booking-channel-payment-readiness-summary.output.json
      package-usage-summary.output.json
```

## Generator and validation tree

```text
  scripts/
    build-all.mjs
    validate-sources.mjs
    render-website.mjs
    render-jsonld.mjs
    render-knowledge-feed.mjs
    render-partner-feed.mjs
    render-whatsapp-messages.mjs
    render-email-templates.mjs
    render-invoice-templates.mjs
    render-guest-portal.mjs
    render-ops-console.mjs
    render-analytics.mjs
    check-drift.mjs
    source-hash.mjs
    migrate-current-files-to-source.mjs
    sync-google-reviews.mjs
    sync-booking-snapshots.mjs
    sync-package-api.mjs

  src/
    api/
      website-page.mjs
      website-routes.mjs
      health.mjs

    lib/
      route-resolver.mjs
      source-loader.mjs
      output-loader.mjs
      source-trace.mjs
      hash.mjs
      validation.mjs
      markdown.mjs
      jsonld.mjs

    renderers/
      website/
        render-page.mjs
        render-travel-guide-page.mjs
        render-tour-page.mjs
        render-policy-page.mjs
        render-review-section.mjs
        render-navigation.mjs

      channels/
        render-whatsapp.mjs
        render-email.mjs
        render-invoice.mjs
        render-guest-portal.mjs
        render-ops-console.mjs
        render-partner-feed.mjs

  schemas/
    source/
      organization-source.schema.json
      people-source.schema.json
      destination-source.schema.json
      travel-guide-source.schema.json
      policy-source.schema.json
      review-source.schema.json
      tour-package-source.schema.json
      commercial-rules-source.schema.json
      operations-rules-source.schema.json
      communication-source.schema.json
      booking-runtime-source.schema.json

    output/
      website-page-output.schema.json
      website-section-output.schema.json
      jsonld-output.schema.json
      knowledge-feed-output.schema.json
      whatsapp-output.schema.json
      email-output.schema.json
      invoice-output.schema.json
      guest-portal-output.schema.json
      ops-console-output.schema.json
      analytics-output.schema.json
```

## Tina CMS tree

Jika Tina CMS dipasang di repo `jvto-ekosistem`, struktur yang disarankan:

```text
  tina/
    config.ts

    collections/
      organization.collection.ts
      people.collection.ts
      destinations.collection.ts
      travel-guide.collection.ts
      policies.collection.ts
      why-jvto.collection.ts
      verify-jvto.collection.ts
      reviews.collection.ts
      tour-packages.collection.ts
      commercial-rules.collection.ts
      operations-rules.collection.ts
      communication.collection.ts

    fields/
      seo-fields.ts
      route-fields.ts
      section-fields.ts
      faq-fields.ts
      evidence-fields.ts
      source-trace-fields.ts
      review-fields.ts
      package-pricing-fields.ts
      itinerary-fields.ts
      policy-fields.ts
```

Jika Tina CMS dipasang di `jvto-web`, maka folder `tina/` berada di `jvto-web`, tetapi collection-nya tetap diarahkan ke file `content-source/**/*.source.json` di repo ekosistem atau ke package/shared repo yang dimount.

## Archive tree

```text
  archive/
    README.md
    DO-NOT-EDIT.md

    public-content-snapshot/
      ...

    jvto-web-main-snapshot/
      ...

    package-data-snapshot/
      ...

    booking-overview-snapshot/
      ...

    customer-portal-detail-snapshot/
      ...

    itinerary-intelligence-snapshot/
      ...
```

Aturan:

- `archive/**` tidak masuk Tina CMS.
- `archive/**` tidak dikonsumsi website.
- `archive/**` hanya untuk audit, pembanding, dan rollback migrasi.

## Endpoint target

```text
GET /api/website/page?route=/travel-guide
GET /api/website/page?route=/travel-guide/booking-information
GET /api/website/page?route=/tours/from-surabaya/bromo-madakaripura-ijen-3d2n
GET /api/website/routes
GET /api/health
```

Endpoint website membaca dari:

```text
5-experience-engine/public-website/pages/*.website-output.json
```

Bukan dari:

```text
content-source/**/*.source.json
archive/**
```

## Contoh mapping source ke output

```text
content-source/travel-guide/booking-information.source.json
content-source/policies/booking-payment-cancellation.source.json
content-source/commercial-rules/deposit-and-balance-rules.source.json
  -> 5-experience-engine/public-website/pages/travel-guide__booking-information.website-output.json
  -> 5-experience-engine/json-ld/travel-guide.schema-output.json
  -> 5-experience-engine/knowledge-feed/travel-guide-feed.json

content-source/reviews/reviews.source.json
  -> 5-experience-engine/public-website/sections/homepage-reviews.website-output.json
  -> 5-experience-engine/json-ld/reviews.schema-output.json
  -> 5-experience-engine/analytics/google-review-insights.output.json
  -> 5-experience-engine/knowledge-feed/review-feed.json

content-source/tour-packages/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.source.json
  -> 2-product-and-commercial-core/tour-products/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.product-contract.json
  -> 2-product-and-commercial-core/pricing-rules/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.pricing.json
  -> 2-product-and-commercial-core/routes-and-itineraries/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.itinerary.json
  -> 2-product-and-commercial-core/channel-availability/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.channel-availability.json
  -> 5-experience-engine/public-website/pages/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.website-output.json
```

## Status edit

```text
content-source/**
  Editable by Tina CMS or maintainers.

2-product-and-commercial-core/**
3-booking-and-journey-core/**
4-operations-core/**
  Can stay as canonical modular core during transition.
  If source files are consolidated, these can become generated/internal contracts.

5-experience-engine/**
  Generated or channel-ready output.
  Do not edit manually unless file is explicitly marked as source.

archive/**
  Read-only snapshot.
```

## Implementasi bertahap

1. Tambah `content-source/` tanpa menghapus folder lama.
2. Migrasi Travel Guide dulu.
3. Buat generator website output untuk `/travel-guide` dan turunannya.
4. Pasang endpoint page-level.
5. Exclude `archive/` dan `*.website-output.json` dari Tina.
6. Migrasi Review ke `reviews.source.json`.
7. Migrasi Tour Package ke `{slug}.source.json`.
8. Setelah stabil, tandai folder lama sebagai generated/internal atau archive.
