# Duplicate File Audit

Tanggal pemeriksaan: 2026-08-12

## Ringkasan

Total file yang diperiksa: 576 file.

Hasil utama:

- Ada 49 grup file yang isinya persis sama secara hash.
- Total file yang terlibat dalam duplikasi persis: 98 file.
- Semua duplikasi persis yang ditemukan adalah antara file aktif dan file di `archive/`.
- Di luar `archive/`, tidak ada file aktif yang isinya persis sama.
- Di luar `archive/`, ada 17 grup paket/tour yang memakai pola banyak file untuk satu objek tour: product contract, pricing, itinerary, channel availability, dan website output.

Kesimpulan jujur: masalah terbesar saat ini bukan duplikat byte-for-byte di folder aktif, tetapi belum adanya aturan eksplisit mana file yang boleh diedit sebagai source dan mana file yang hanya snapshot/output.

## Kategori duplikasi

### 1. Duplikat persis karena archive

Ini file yang isinya sama persis dengan file aktif, tetapi salinannya masih ada di `archive/`. Ini tidak otomatis salah, karena archive memang bisa dipakai sebagai snapshot. Namun file archive harus diperlakukan read-only dan tidak boleh masuk Tina CMS.

#### Travel Guide dan Policy

| File aktif | Duplikat di archive |
|---|---|
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/booking-information.md` | `archive/public-content-snapshot/pages/travel-guide/booking-information.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/index.md` | `archive/public-content-snapshot/pages/travel-guide/index.md` |
| `1-knowledge-and-evidence-core/policies/inclusions-exclusions.md` | `archive/public-content-snapshot/pages/policy/inclusions-exclusions.md` |
| `1-knowledge-and-evidence-core/health-and-safety-rules/weather-and-closures.md` | `archive/public-content-snapshot/pages/travel-guide/weather-and-closures.md` |
| `1-knowledge-and-evidence-core/health-and-safety-rules/safety-on-tours.md` | `archive/public-content-snapshot/pages/travel-guide/safety-on-tours.md` |
| `1-knowledge-and-evidence-core/health-and-safety-rules/packing-and-fitness.md` | `archive/public-content-snapshot/pages/travel-guide/packing-and-fitness.md` |
| `1-knowledge-and-evidence-core/policies/privacy.md` | `archive/public-content-snapshot/pages/policy/privacy.md` |
| `1-knowledge-and-evidence-core/policies/index.md` | `archive/public-content-snapshot/pages/policy/index.md` |
| `1-knowledge-and-evidence-core/health-and-safety-rules/blue-fire-and-sunrise.md` | `archive/public-content-snapshot/pages/travel-guide/blue-fire-and-sunrise.md` |
| `1-knowledge-and-evidence-core/fact-review-and-ownership/source-content-readme.md` | `archive/public-content-snapshot/README.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/what-is-included.md` | `archive/public-content-snapshot/pages/travel-guide/what-is-included.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/bromo-sunrise.md` | `archive/public-content-snapshot/pages/travel-guide/bromo-sunrise.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/how-booking-works.md` | `archive/public-content-snapshot/pages/travel-guide/how-booking-works.md` |
| `1-knowledge-and-evidence-core/health-and-safety-rules/booking-safety.md` | `archive/public-content-snapshot/pages/travel-guide/booking-safety.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/payment-and-deposit.md` | `archive/public-content-snapshot/pages/travel-guide/payment-and-deposit.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/malang-batu.md` | `archive/public-content-snapshot/pages/travel-guide/malang-batu.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/cancellation-travel-credit.md` | `archive/public-content-snapshot/pages/travel-guide/cancellation-travel-credit.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/private-tour.md` | `archive/public-content-snapshot/pages/travel-guide/private-tour.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/why-stay-near-ijen.md` | `archive/public-content-snapshot/pages/travel-guide/why-stay-near-ijen.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/finish-in-bali.md` | `archive/public-content-snapshot/pages/travel-guide/finish-in-bali.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/rooming-and-accommodation.md` | `archive/public-content-snapshot/pages/travel-guide/rooming-and-accommodation.md` |
| `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/vehicle-and-luggage.md` | `archive/public-content-snapshot/pages/travel-guide/vehicle-and-luggage.md` |

#### Itinerary Intelligence dan Operations

| File aktif | Duplikat di archive |
|---|---|
| `4-operations-core/hotel-and-partner-confirmation/hotels-master.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/17-hotels-master.json` |
| `2-product-and-commercial-core/routes-and-itineraries/route-leg-index.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/04-route-leg-index.json` |
| `2-product-and-commercial-core/tour-products/package-catalog-index.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/package-catalog-index.json` |
| `2-product-and-commercial-core/pricing-rules/cost-components.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/10-cost-components.json` |
| `2-product-and-commercial-core/routes-and-itineraries/standard-package-route-map.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/11-package-route-map.json` |
| `4-operations-core/operational-events/activities-master.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/18-activities-master.json` |
| `4-operations-core/trip-readiness/recommendation-rules.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/12-recommendation-rules.json` |
| `4-operations-core/trip-readiness/operational-context-index.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/operational-context-index.json` |
| `4-operations-core/operational-events/meal-stops.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/27-meal-stops.json` |
| `4-operations-core/crew-assignment/transport-crew-rules.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/23-transport-crew-rules.json` |
| `2-product-and-commercial-core/add-ons/bali-transport-addons.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/26-bali-transport-addons.json` |
| `2-product-and-commercial-core/pricing-rules/package-pricing-matrix.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/16-package-pricing.json` |
| `2-product-and-commercial-core/routes-and-itineraries/route-node-index.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/route-node-index.json` |
| `4-operations-core/operational-events/operational-events.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/07-operational-events.json` |
| `4-operations-core/closure-and-plan-b/road-situation-profiles.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/05-road-situation-profiles.json` |
| `4-operations-core/hotel-and-partner-confirmation/accommodation-logic.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/09-accommodation-logic.json` |
| `2-product-and-commercial-core/routes-and-itineraries/location-alias-registry.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/location-alias-registry.json` |
| `2-product-and-commercial-core/routes-and-itineraries/tomtom-geotag-index.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/28-tomtom-geotag-index.json` |
| `3-booking-and-journey-core/pickup-and-dropoff/pickup-contexts.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/01-pickup-contexts.json` |
| `4-operations-core/vehicle-assignment/transport-master.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/19-transport-master.json` |
| `5-experience-engine/public-website/visual-map-layer.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/13-visual-map-layer.json` |
| `3-booking-and-journey-core/pickup-and-dropoff/dropoff-contexts.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/02-dropoff-contexts.json` |
| `2-product-and-commercial-core/add-ons/other-catalog-items.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/20-others-master.json` |
| `5-experience-engine/public-website/output-template-map.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/14-output-template-map.json` |
| `3-booking-and-journey-core/pickup-and-dropoff/time-window-rules.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/03-time-window-rules.json` |
| `4-operations-core/operational-events/meal-logic.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/08-meal-logic.json` |
| `4-operations-core/trip-readiness/staging-area-contexts.json` | `archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/staging-area-contexts.json` |

## 2. File aktif yang tidak persis duplikat, tetapi dobel secara model

Ini bukan duplikat byte-for-byte. Namun dari sudut CMS dan source-of-truth, ini bisa menjadi dobel karena data satu objek tersebar di banyak file aktif.

### Tour product

Setiap tour saat ini punya pola 5 file:

- `2-product-and-commercial-core/tour-products/{slug}.product-contract.json`
- `2-product-and-commercial-core/pricing-rules/{slug}.pricing.json`
- `2-product-and-commercial-core/routes-and-itineraries/{slug}.itinerary.json`
- `2-product-and-commercial-core/channel-availability/{slug}.channel-availability.json`
- `5-experience-engine/public-website/{slug}.website-output.json`

Slug yang terkena pola ini:

- `tours__from-bali__bromo-ijen-3d2n`
- `tours__from-bali__ijen-bromo-madakaripura-3d2n`
- `tours__from-bali__ijen-papuma-tumpak-sewu-bromo-4d3n`
- `tours__from-bali__ijen-papuma-tumpak-sewu-bromo-5d4n`
- `tours__from-surabaya__bromo-1d1n`
- `tours__from-surabaya__bromo-2d1n`
- `tours__from-surabaya__bromo-madakaripura-ijen-3d2n`
- `tours__from-surabaya__ijen-2d1n`
- `tours__from-surabaya__ijen-bromo-madakaripura-3d2n`
- `tours__from-surabaya__ijen-bromo-madakaripura-4d3n`
- `tours__from-surabaya__ijen-bromo-madakaripura-malang-5d4n`
- `tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-4d3n`
- `tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-5d4n`
- `tours__from-surabaya__ijen-papuma-tumpak-sewu-bromo-malang-6d5n`
- `tours__from-surabaya__taman-safari-prigen-bromo-madakaripura-3d2n`
- `tours__from-surabaya__tumpak-sewu-bromo-3d2n`
- `tours__from-surabaya__tumpak-sewu-bromo-ijen-4d3n`

Penilaian: ini boleh kalau `product-contract`, `pricing`, `itinerary`, dan `channel-availability` dianggap source modular, sedangkan `website-output` generated. Tetapi untuk Tina CMS, pola ini akan terasa seperti harus edit banyak file.

Rekomendasi: untuk CMS, buat satu editable source per tour atau satu Tina form yang menulis ke source modular tersebut. Jangan edit `website-output` langsung.

### Review

File aktif terkait review:

- `1-knowledge-and-evidence-core/credentials-and-public-evidence/google-review-evidence.json`
- `1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json`
- `1-knowledge-and-evidence-core/faqs/why-jvto-reviews.json`
- `1-knowledge-and-evidence-core/narrative-claims/why-jvto-pages/reviews.json`
- `5-experience-engine/analytics/google-review-insights.json`
- `5-experience-engine/reviews/crew-featured-review-evidence.json`
- `5-experience-engine/reviews/google-review-crew-alias-reconciliation.json`
- `5-experience-engine/reviews/google-review-media-records.json`
- `5-experience-engine/reviews/google-review-records.json`

Penilaian: ini bukan duplikat persis, tetapi domain review tersebar. Kalau tujuan ke depan adalah Tina CMS dan banyak output, bentuk yang lebih nyaman adalah satu source domain review, misalnya:

- `5-experience-engine/reviews/reviews.source.json`

Lalu output/generated:

- `5-experience-engine/public-website/homepage-reviews.website-output.json`
- `5-experience-engine/public-website/crew-reviews.website-output.json`
- `5-experience-engine/analytics/google-review-insights.json`
- `5-experience-engine/json-ld/review-schema-output.json`
- `5-experience-engine/knowledge-feed/reviews-feed.json`

Bagian yang boleh diedit manusia:

- crew alias;
- featured review selection;
- hidden/suppressed review;
- editorial grouping.

Bagian yang tidak boleh diedit manual:

- raw Google reviews;
- raw Google media;
- generated analytics;
- generated website output.

### Booking dan customer portal

File aktif yang saling overlap secara domain:

- `3-booking-and-journey-core/booking/booking-records.json`
- `3-booking-and-journey-core/booking/booking-summary.json`
- `3-booking-and-journey-core/booking/customer-portal-booking-details.json`
- `3-booking-and-journey-core/payments/payment-summary.json`
- `3-booking-and-journey-core/pickup-and-dropoff/customer-portal-logistics.json`
- `3-booking-and-journey-core/pickup-and-dropoff/pickup-dropoff-records.json`
- `4-operations-core/trip-readiness/booking-readiness-records.json`
- `4-operations-core/trip-readiness/booking-readiness-gap-report.json`
- `5-experience-engine/guest-portal/customer-portal-detail-records.json`
- `5-experience-engine/guest-portal/guest-portal-records.json`

Penilaian: ini bukan duplikat persis, tetapi ada banyak view atas booking yang sama. Untuk booking, ini wajar kalau dibedakan sebagai:

- raw booking source;
- payment source;
- logistics source;
- readiness source;
- guest portal output.

Risiko: kalau semuanya dianggap editable, data akan pecah. Yang boleh menjadi source hanya booking/payment/logistics/readiness core. Guest portal di `5-experience-engine` harus dianggap output.

## 3. File yang sebaiknya tidak masuk Tina CMS

Folder/file berikut sebaiknya tidak diedit dari Tina:

- semua isi `archive/`;
- semua file `*.website-output.json`;
- `5-experience-engine/analytics/*.json`;
- `5-experience-engine/knowledge-feed/*.json` bila sudah generated;
- `5-experience-engine/json-ld/*.json` bila sudah generated;
- `5-experience-engine/guest-portal/*records.json` bila berisi output portal;
- raw snapshot dari booking, package, atau customer portal.

## 4. File yang aman dijadikan source/editable

Untuk tahap awal, file yang boleh diedit manusia sebaiknya hanya file yang memang canonical source:

- `1-knowledge-and-evidence-core/**`
- `2-product-and-commercial-core/tour-products/**`
- `2-product-and-commercial-core/pricing-rules/**`
- `2-product-and-commercial-core/routes-and-itineraries/**`
- `2-product-and-commercial-core/channel-availability/**`
- `3-booking-and-journey-core/**` untuk data operasional yang memang bukan snapshot mentah;
- `4-operations-core/**` untuk aturan operasi dan readiness;
- source file baru seperti `*.source.json` kalau nanti dibuat untuk Tina.

Catatan: walaupun folder `2-product-and-commercial-core` saat ini modular, untuk Tina lebih enak dibuat satu form per tour. Form itu boleh menyimpan ke banyak file atau nanti dikonsolidasikan menjadi satu `{slug}.source.json`.

## Rekomendasi struktur final supaya tidak dobel

Gunakan aturan ini:

```text
*.source.json / core files
  = boleh diedit, source of truth

*.website-output.json
  = generated, read-only

*.schema-output.json / json-ld output
  = generated, read-only

*-feed.json
  = generated, read-only kecuali dinyatakan source

archive/**
  = snapshot, read-only, tidak masuk CMS
```

Untuk domain yang saat ini paling terasa dobel, prioritas perapihan:

1. Review: satukan ke `reviews.source.json`, lalu generate output.
2. Tour product: pertimbangkan `{slug}.source.json` atau satu Tina form per slug yang menulis ke product/pricing/itinerary/channel.
3. Travel Guide: buat `travel-guide/{slug}.source.json` atau page contract per route.
4. Booking/guest portal: pastikan `5-experience-engine/guest-portal` adalah output, bukan tempat edit booking.
5. Archive: exclude dari UI utama dan Tina agar tidak terlihat seperti file aktif.

## Jawaban pendek

File yang benar-benar dobel secara isi masih ada, tetapi semuanya berada dalam pola `file aktif` + `archive snapshot`.

File aktif saat ini tidak ada yang isinya persis sama, tetapi ada beberapa domain yang dobel secara konsep: tour product, review, booking/guest portal, dan travel guide/page output. Ini perlu dibereskan dengan label source vs output, bukan langsung delete file.

## 5. Duplikat konseptual aktif di luar archive

Bagian ini menjawab pertanyaan: file tidak 100% sama, tetapi secara isi/topik sangat mirip dan berpotensi membuat editor bingung.

### Booking information, payment, deposit, cancellation

File yang overlap:

- `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/booking-information.md`
- `1-knowledge-and-evidence-core/faqs/travel-guide-booking-information.json`
- `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/how-booking-works.md`
- `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/payment-and-deposit.md`
- `1-knowledge-and-evidence-core/policies/booking-payment-cancellation.json`
- `2-product-and-commercial-core/deposit-rules/deposit-and-balance-rules.json`
- `2-product-and-commercial-core/cancellation-and-credit-rules/package-credit-rules.json`
- `3-booking-and-journey-core/inquiry/website-tour-to-checkout-flow.json`
- `3-booking-and-journey-core/lifecycle-status/booking-flow.json`

Penilaian:

- Ini bukan duplicate murni, tetapi isinya saling menulis ulang hal yang sama: website-only booking, 20% deposit, close-to-departure full payment, balance deadline, cancellation, package credit, official voucher.
- Yang seharusnya menjadi source utama adalah policy/rule object, bukan Travel Guide copy.
- Travel Guide dan FAQ seharusnya menjadi consumer/output dari policy/rules.

Rekomendasi:

- Source utama:
  - `1-knowledge-and-evidence-core/policies/booking-payment-cancellation.json`
  - `2-product-and-commercial-core/deposit-rules/deposit-and-balance-rules.json`
  - `2-product-and-commercial-core/cancellation-and-credit-rules/package-credit-rules.json`
  - `3-booking-and-journey-core/inquiry/website-tour-to-checkout-flow.json`
- Output/editorial page:
  - `travel-guide-pages/booking-information.md`
  - `travel-guide-pages/how-booking-works.md`
  - `travel-guide-pages/payment-and-deposit.md`
  - `faqs/travel-guide-booking-information.json`

### Inclusion dan exclusion

File yang overlap:

- `1-knowledge-and-evidence-core/policies/inclusions-exclusions.md`
- `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/what-is-included.md`
- `2-product-and-commercial-core/inclusions-and-exclusions/inclusions-exclusions-baseline.json`
- semua `2-product-and-commercial-core/tour-products/*.product-contract.json` yang punya inclusion/exclusion detail
- semua `5-experience-engine/public-website/*.website-output.json` yang menampilkan inclusion/exclusion

Penilaian:

- Policy menjelaskan aturan umum.
- Baseline JSON adalah rule source.
- Product contract menerapkan rule ke tour tertentu.
- Travel Guide adalah penjelasan customer-facing.
- Website output adalah generated.

Risiko terjadi kalau semua file ini diedit manual dari CMS. Yang benar: edit baseline/product contract, lalu generate halaman dan output.

### Review

File yang overlap:

- `1-knowledge-and-evidence-core/credentials-and-public-evidence/google-review-evidence.json`
- `1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json`
- `1-knowledge-and-evidence-core/faqs/why-jvto-reviews.json`
- `1-knowledge-and-evidence-core/narrative-claims/why-jvto-pages/reviews.json`
- `5-experience-engine/reviews/google-review-records.json`
- `5-experience-engine/reviews/google-review-media-records.json`
- `5-experience-engine/reviews/google-review-crew-alias-reconciliation.json`
- `5-experience-engine/reviews/crew-featured-review-evidence.json`
- `5-experience-engine/analytics/google-review-insights.json`

Penilaian:

- Review raw, media, alias crew, featured selection, narrative, dan analytics saat ini tersebar.
- Ini domain yang paling cocok digabung menjadi satu source file atau satu CMS form, karena outputnya bisa banyak.

Rekomendasi source masa depan:

- `5-experience-engine/reviews/reviews.source.json`

Lalu generate:

- homepage review output;
- crew review output;
- review schema;
- analytics;
- AI/knowledge feed.

### Pickup, dropoff, dan customer portal logistics

File yang overlap:

- `3-booking-and-journey-core/pickup-and-dropoff/pickup-contexts.json`
- `3-booking-and-journey-core/pickup-and-dropoff/dropoff-contexts.json`
- `3-booking-and-journey-core/pickup-and-dropoff/pickup-dropoff-records.json`
- `3-booking-and-journey-core/pickup-and-dropoff/customer-portal-logistics.json`
- `3-booking-and-journey-core/pickup-and-dropoff/my-booking-portal-fields.json`
- `5-experience-engine/guest-portal/guest-portal-records.json`
- `5-experience-engine/guest-portal/customer-portal-detail-records.json`

Penilaian:

- `pickup/dropoff records` dan `customer portal logistics` sangat overlap.
- Yang satu harus menjadi source booking/logistics.
- Yang lain harus menjadi output portal.

Rekomendasi:

- Source: `3-booking-and-journey-core/pickup-and-dropoff/*`
- Output: `5-experience-engine/guest-portal/*`

### Crew assignment dan trip readiness

File yang overlap:

- `4-operations-core/crew-assignment/crew-assignment-records.json`
- `4-operations-core/crew-assignment/crew-roster-from-bookings.json`
- `4-operations-core/crew-assignment/customer-portal-crew-records.json`
- `4-operations-core/trip-readiness/booking-readiness-records.json`
- `5-experience-engine/ops-console/ops-console-records.json`
- `5-experience-engine/guest-portal/guest-portal-records.json`

Penilaian:

- Crew assignment muncul sebagai assignment source, readiness source, customer portal output, dan ops console output.
- Ini benar secara channel, tapi perlu label jelas agar tidak semua dianggap editable.

Rekomendasi:

- Assignment source: `4-operations-core/crew-assignment/crew-assignment-records.json`
- Readiness source: `4-operations-core/trip-readiness/booking-readiness-records.json`
- Output: `customer-portal-crew-records.json`, `ops-console-records.json`, dan `guest-portal-records.json`

### Tour package rules

File yang overlap untuk setiap tour:

- `2-product-and-commercial-core/tour-products/{slug}.product-contract.json`
- `2-product-and-commercial-core/pricing-rules/{slug}.pricing.json`
- `2-product-and-commercial-core/routes-and-itineraries/{slug}.itinerary.json`
- `2-product-and-commercial-core/channel-availability/{slug}.channel-availability.json`
- `5-experience-engine/public-website/{slug}.website-output.json`

Penilaian:

- Ini bukan duplicate salah, tetapi terlalu modular untuk CMS manual.
- Banyak `channel-availability` antar package sangat mirip, bahkan beberapa hampir identik hanya beda slug/package.
- Banyak product contract antar variasi route juga mirip karena memakai destinasi dan rules yang sama.

Rekomendasi:

- Tahap CMS: buat satu `tour-package/{slug}.source.json` atau satu Tina form per package.
- Tahap generator: pecah/generate ke pricing, itinerary, channel availability, website output, partner feed.
- Jangan edit `website-output` langsung.
