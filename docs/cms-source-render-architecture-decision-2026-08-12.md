# CMS Source and Multi-Platform Render Architecture Decision

Tanggal: 2026-08-12

## Goal

Goal utama:

> Content hanya punya satu source, bisa diedit dari CMS, lalu bisa dirender ke beberapa platform.

Platform target:

- website;
- JSON-LD/schema;
- AI/search feed;
- WhatsApp;
- email;
- invoice/receipt;
- guest portal;
- ops console;
- partner feed;
- analytics.

## Keputusan

Struktur terbaik bukan membuat `content-source/` sebagai folder utama baru yang berdiri di luar 5 folder ekosistem.

Struktur terbaik adalah:

> **Source editable tetap berada di 5 folder ekosistem, tetapi disusun sebagai satu source file per objek besar. Experience Engine membaca source tersebut dan menghasilkan banyak output.**

Dengan kata lain:

```text
1-knowledge-and-evidence-core/
2-product-and-commercial-core/
3-booking-and-journey-core/
4-operations-core/
  = source of truth dan editable source

5-experience-engine/
  = generated output / channel output

archive/
  = read-only snapshot
```

## Kenapa bukan `content-source/` terpisah?

`content-source/` memang enak untuk Tina CMS, tetapi ada risiko besar:

- membuat layer keenam yang tidak ada di konsep awal;
- membingungkan mandat "Lima bagian JVTO Operating Ecosystem";
- membuat 1-4 core terasa seperti hasil turunan, bukan source of truth;
- berpotensi membuat data ditulis dua kali: di `content-source` dan di core.

Karena goal-nya adalah "content 1", maka source harus langsung berada di domain yang benar.

## Prinsip final

### 1. Satu domain object = satu editable source

Contoh:

```text
1-knowledge-and-evidence-core/travel-guide/booking-information.source.json
2-product-and-commercial-core/tour-packages/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.source.json
5-experience-engine/reviews/reviews.source.json
```

File `.source.json` ini adalah yang diedit CMS.

### 2. Source boleh besar selama masih satu objek bisnis

Untuk CMS, lebih baik satu file agak besar tetapi jelas daripada lima file kecil yang harus diedit manual.

Contoh `booking-information.source.json` boleh berisi:

- route;
- SEO;
- hero;
- main content;
- FAQ;
- policy references;
- evidence references;
- related pages;
- last reviewed;
- owner.

### 3. Output selalu generated

Contoh:

```text
5-experience-engine/public-website/pages/travel-guide__booking-information.website-output.json
5-experience-engine/json-ld/travel-guide__booking-information.schema-output.json
5-experience-engine/knowledge-feed/travel-guide-feed.json
```

File output tidak diedit manual dan tidak masuk Tina CMS.

### 4. Jika data dipakai lintas channel, tetap satu source

Contoh deposit 20%:

Source:

```text
2-product-and-commercial-core/commercial-rules/deposit-and-balance-rules.source.json
```

Output:

```text
5-experience-engine/public-website/pages/travel-guide__booking-information.website-output.json
5-experience-engine/whatsapp-messages/payment-reminder.output.json
5-experience-engine/email-templates/new-reservation.output.json
5-experience-engine/quotation-and-invoice/invoice-template.output.json
```

Jika deposit berubah, edit satu source, lalu generate semua output.

## Struktur folder final yang direkomendasikan

```text
jvto-ekosistem/
  1-knowledge-and-evidence-core/
    organization/
      organization.source.json
      credentials.source.json
      partners.source.json

    people/
      people-and-crew.source.json
      crew-aliases.source.json

    evidence/
      evidence-registry.source.json
      google-review-evidence.source.json
      review-platforms.source.json

    destinations/
      index.source.json
      mount-bromo.source.json
      ijen-crater.source.json
      tumpak-sewu-waterfall.source.json
      madakaripura-waterfall.source.json
      papuma-beach.source.json

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
      payment-and-deposit.source.json
      how-booking-works.source.json
      what-is-included.source.json
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

  2-product-and-commercial-core/
    tour-packages/
      package-index.source.json
      package-shared-rules.source.json
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
      health-requirements-by-product.source.json
      add-ons.source.json
      channel-availability-rules.source.json

  3-booking-and-journey-core/
    booking/
      booking-records.source.json
      booking-summary.output-source.json

    lifecycle/
      booking-flow.source.json
      status-flow.source.json

    payment/
      payment-methods.source.json
      payment-records.source.json

    logistics/
      pickup-dropoff-records.source.json
      pickup-contexts.source.json
      dropoff-contexts.source.json
      time-window-rules.source.json

    traveler/
      traveler-records.source.json
      country-pax-summary.output-source.json

    documents/
      e-voucher.source.json

  4-operations-core/
    operations-rules/
      closure-plan-b-rules.source.json
      road-situation-profiles.source.json
      accommodation-logic.source.json
      meal-logic.source.json
      guest-meeting-protocol.source.json

    crew-assignment/
      crew-assignment-records.source.json
      crew-roster.source.json
      transport-crew-rules.source.json

    vehicle-assignment/
      transport-master.source.json
      vehicle-plans.source.json

    trip-readiness/
      booking-readiness-records.source.json
      readiness-signals.source.json
      recommendation-rules.source.json

    expenses/
      booking-expense-records.source.json

  5-experience-engine/
    reviews/
      reviews.source.json

    communication/
      whatsapp-templates.source.json
      email-templates.source.json
      invoice-receipt-templates.source.json

    public-website/
      pages/
        *.website-output.json
      sections/
        *.website-output.json

    json-ld/
      *.schema-output.json

    knowledge-feed/
      *.feed-output.json
      llms.txt

    whatsapp-messages/
      *.message-output.json

    email-templates/
      *.email-output.json

    quotation-and-invoice/
      *.document-output.json

    guest-portal/
      *.portal-output.json

    ops-console/
      *.ops-output.json

    partner-feed/
      *.partner-output.json

    analytics/
      *.analytics-output.json

    manifests/
      source-output-map.json
      route-output-index.json
      source-hash-index.json
      drift-report.json

  schemas/
    source/
      *.source.schema.json
    output/
      *.output.schema.json

  scripts/
    validate-sources.mjs
    render-all.mjs
    render-website.mjs
    render-jsonld.mjs
    render-knowledge-feed.mjs
    render-messages.mjs
    render-documents.mjs
    render-guest-portal.mjs
    render-ops-console.mjs
    check-drift.mjs

  archive/
    README.md
    DO-NOT-EDIT.md
    ...
```

## Kenapa Review tetap di Experience Engine?

Review agak berbeda dari Knowledge biasa.

Raw review berasal dari platform eksternal, lalu digunakan untuk:

- homepage proof;
- crew proof;
- schema;
- AI feed;
- analytics;
- trust narrative.

Karena review adalah bahan experience/proof lintas channel, source gabungannya paling masuk akal berada di:

```text
5-experience-engine/reviews/reviews.source.json
```

Tetapi evidence ringkas tentang platform review tetap boleh berada di:

```text
1-knowledge-and-evidence-core/evidence/review-platforms.source.json
```

## Bagaimana Tina CMS bekerja

Tina hanya membuka file:

```text
*.source.json
```

Tina tidak membuka:

```text
*.website-output.json
*.schema-output.json
*.feed-output.json
*.message-output.json
archive/**
```

Setelah save dari Tina:

```text
source berubah
  -> validate
  -> render outputs
  -> check drift
  -> publish
```

## Contoh: Travel Guide Booking Information

CMS mengedit:

```text
1-knowledge-and-evidence-core/travel-guide/booking-information.source.json
1-knowledge-and-evidence-core/policies/booking-payment-cancellation.source.json
2-product-and-commercial-core/commercial-rules/deposit-and-balance-rules.source.json
```

Generator menghasilkan:

```text
5-experience-engine/public-website/pages/travel-guide__booking-information.website-output.json
5-experience-engine/json-ld/travel-guide__booking-information.schema-output.json
5-experience-engine/knowledge-feed/travel-guide.feed-output.json
5-experience-engine/whatsapp-messages/payment-reminder.message-output.json
5-experience-engine/email-templates/new-reservation.email-output.json
```

Jika deposit berubah dari 20% ke nilai lain, edit dilakukan di:

```text
2-product-and-commercial-core/commercial-rules/deposit-and-balance-rules.source.json
```

Bukan di Travel Guide, FAQ, invoice, WhatsApp, dan website-output satu per satu.

## Contoh: Tour Package

CMS mengedit satu file:

```text
2-product-and-commercial-core/tour-packages/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.source.json
```

Generator menghasilkan:

```text
5-experience-engine/public-website/pages/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.website-output.json
5-experience-engine/json-ld/tours__from-surabaya__bromo-madakaripura-ijen-3d2n.schema-output.json
5-experience-engine/knowledge-feed/product.feed-output.json
5-experience-engine/partner-feed/klook-product-feed.partner-output.json
5-experience-engine/quotation-and-invoice/tour-line-items.document-output.json
```

## Kesimpulan

Keputusan terbaik untuk goal JVTO:

> **Jangan tambah `content-source/` sebagai struktur utama. Tetap gunakan 5 folder awal sebagai domain source of truth, tetapi rapikan menjadi file `.source.json` yang mudah diedit CMS. Experience Engine hanya menghasilkan output multi-platform.**

Ini paling cocok karena:

- tetap patuh pada 5 folder awal;
- konten tidak dobel;
- CMS punya satu tempat edit per objek;
- output bisa banyak;
- website tidak perlu merakit data mentah;
- archive tidak mengganggu source aktif.
