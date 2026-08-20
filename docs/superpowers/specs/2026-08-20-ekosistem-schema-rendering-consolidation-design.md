# Ekosistem Schema Rendering Consolidation — Design Spec

Tanggal: 2026-08-20
Status: approved, ready for implementation plan

## Goal

`AggregateRating`, `Review`, dan `TouristTrip`/`Offer` schema.org JSON-LD
saat ini dirakit secara live oleh jvto-web (dari fakta mentah yang dibaca
langsung dari ekosistem). Ekosistem sendiri dibangun sebagai pusat data
yang punya banyak output turunan (website, schema, template WA, dst) —
perakitan schema untuk tiga jenis node ini dipindahkan ke ekosistem,
konsisten dengan pola yang sudah dipakai untuk semua node JSON-LD lain.
jvto-web berubah dari "perakit" jadi "penyaji" untuk ketiga jenis node ini.

Ini membalikkan keputusan owner 2026-08-15 yang melarang rating dibekukan
di ekosistem — keputusan itu dibuat karena saat itu tidak ada mekanisme
regenerasi otomatis (angka hand-copied 4.91/203 melenceng dan tidak pernah
diperbarui). Desain ini mengganti "dibekukan sekali" dengan "diregenerasi
otomatis setiap sync data terkait selesai" (lihat bagian Trigger), yang
menghilangkan penyebab insiden itu tanpa mengulanginya.

## Scope

Dua repo, satu perubahan terkoordinasi:

- **jvto-ekosistem**: 3 penambahan ke render pipeline yang sudah ada.
- **jvto-web**: penghapusan kode perakit JSON-LD untuk 3 jenis node ini,
  diganti dengan pembacaan output pre-rendered ekosistem (pola yang sama
  dengan `loadEcosystemPage`/`getEcosystemPackagesList` yang sudah dipakai
  untuk konten lain).

**Tidak termasuk scope ini:**
- Fungsi pembaca fakta mentah non-schema (`getPublicAggregateRating()`
  dipakai juga untuk teks "4.9 ★" yang tampil di halaman, dan API publik
  `/api/product/[slug]`) — ini TETAP ADA, tidak dihapus. Yang dihapus
  hanya bagian yang membungkus fakta itu jadi node `{"@type":
  "AggregateRating", ...}`.
- Template WhatsApp — disebut user sebagai bagian dari visi jangka panjang
  ekosistem, tapi tidak ada pekerjaan konkret terkait WA di scope ini.
- 14 generator Tier B/C/D dari plan booking-sync sebelumnya — tidak terkait.

## Bagian 1 — Rating (`AggregateRating`)

### Sumber & titik hook

Ekosistem sudah punya satu fungsi bersama, `buildOrganizationNode()` di
`scripts/lib/build-organization.mjs`, yang dipanggil untuk merakit node
Organization (`@id: .../#organization`) di **setiap** halaman yang
merender pipeline `render-web-content-sources.mjs` (13 route di jvto-web
memakai node ini: home, tours hub x3, why-jvto x2, markets x2,
verify-jvto, dan 2 halaman PDP tour via node yang sama).

Tambahkan field `aggregateRating` ke `buildOrganizationNode()`, dibaca dari
`1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json`
(entri `platform === "Google Maps"`, sama seperti yang dipakai
`getPublicAggregateRating()` sekarang):

```javascript
aggregateRating: {
  "@type": "AggregateRating",
  ratingValue: googleProfile.rating,
  reviewCount: googleProfile.reviewCount,
  bestRating: 5,
}
```

Karena `buildOrganizationNode()` dipakai bersama, satu perubahan ini
otomatis muncul di 13 halaman setelah regenerasi — tidak perlu menyentuh
generator per halaman.

### jvto-web — yang dihapus

Bagian JSON-LD-wrapping AggregateRating di:
`src/lib/schemas/buildHomepageSchemas.ts`,
`src/lib/schemas/buildWhyJvtoSchemas.ts`,
`src/lib/schemas/buildToursHubSchemas.ts`,
`src/lib/schemas/entityGraph.ts`.

Diganti: baca `aggregateRating` langsung dari node Organization di
`schema-output.json` halaman terkait (sudah dibaca via `loadEcosystemPage`
untuk bagian lain halaman yang sama — tidak perlu pemanggilan baru).

`getPublicAggregateRating()` **tetap ada**, tidak berubah — tetap dipakai
untuk teks rating yang tampil (bukan schema) dan API `/api/product/[slug]`.

## Bagian 2 — Review nodes

### Sumber & output baru — dua halaman berbeda, bukan satu

Koreksi hasil pengecekan langsung ke jvto-web (bukan asumsi dari nama
route): `why-jvto/[slug]/page.tsx` **hanya** memakai data review untuk
`slug === "reviews"` (hub). Halaman detail per-review adalah route
terpisah, `why-jvto/reviews/[id]/page.tsx` — `id` numerik dari
`reviews.json`, **tidak** di-static-generate (tidak ada
`generateStaticParams`), jadi ada satu halaman live per review, tumbuh
tiap ada review baru (217 saat ini, di-sync harian).

Generator baru, `scripts/lib/booking-sync/generators/review-schema-nodes.mjs`
(atau lokasi setara di luar folder booking-sync — nama pasti ditentukan di
implementation plan), baca
`1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json`
(217 record), hasilkan dua bentuk output:

- **Hub** — Node `Review` untuk **setiap** review dipasang di satu file:
  `5-experience-engine/json-ld/pages/why-jvto__reviews.schema-output.json`.
- **Detail per-review** — 217 file terpisah (tumbuh tiap sync, sama seperti
  pola generator booking-records yang sudah menangani volume serupa):
  `5-experience-engine/json-ld/pages/why-jvto__reviews__<id>.schema-output.json`,
  masing-masing satu node `Review` dengan struktur nested-dalam-`Product`
  meniru bentuk yang sekarang dirakit `why-jvto/reviews/[id]/page.tsx`
  (`@id: .../#review-{id}`, `id` dipertahankan verbatim dari `reviews.json`
  — halaman itu sendiri sudah mendokumentasikan bahwa id ini tidak pernah
  diubah/dinomori ulang).

Setiap node `Review` menunjuk `itemReviewed: {"@id": ORG_ID}` — memakai
`ORG_ID` yang sudah diekspor `build-organization.mjs`, konsisten dengan
pola cross-reference yang sudah ada di seluruh pipeline.

### jvto-web — yang dihapus

`buildIndividualReviewSchemas()` di `src/lib/schemas/buildWhyJvtoSchemas.ts`
dan pemanggilnya di `why-jvto/reviews/page.tsx` (hub). Diganti baca node
`Review` dari `why-jvto__reviews.schema-output.json`.

Builder inline `Review`-nested-`Product` di `why-jvto/reviews/[id]/page.tsx`
dihapus, diganti baca `why-jvto__reviews__<id>.schema-output.json` — file
ini genap 217 di awal implementasi dan akan terus bertambah setiap sync;
halaman ini butuh fallback eksplisit (`notFound()`) untuk id yang belum
sempat ter-generate ekosistem antara review baru masuk dan sync berikutnya
jalan (celah ini sudah ada risikonya sekarang dengan pola serupa di
booking-records, diterima dengan cara yang sama).

## Bagian 3 — `TouristTrip` + `Offer`

### Sumber & output baru

17 file `schema-output.json` **baru** (belum ada sama sekali di ekosistem
— folder `5-experience-engine/json-ld/pages/` sekarang hanya berisi
halaman hub tour, bukan PDP individual), satu per package:

```
5-experience-engine/json-ld/pages/tours__from-bali__<slug>.schema-output.json       (4 file)
5-experience-engine/json-ld/pages/tours__from-surabaya__<slug>.schema-output.json   (13 file)
```

Generator baru baca
`2-product-and-commercial-core/tour-products/<slug>.product-contract.json`,
hasilkan node `TouristTrip` (`@id: {route}#tour`) + `Offer`/`AggregateOffer`
(harga, `priceCurrency: "IDR"`, `availability`) — struktur menyalin field
yang sudah dipakai jvto-web sekarang di
`tours/from-bali/[slug]/page.tsx:271-303,182-195,321-329` dan padanannya di
`from-surabaya`, supaya keluarannya setara (bukan desain field baru).

Setiap halaman PDP baru ini juga otomatis dapat node Organization (dengan
`aggregateRating`, dari Bagian 1) via pipeline render yang sama — jadi PDP
akan punya `Organization` + `TouristTrip` + `Offer` dalam satu `@graph`,
konsisten dengan halaman lain di ekosistem.

### jvto-web — yang dihapus

Builder `TouristTrip`/`Offer`/`AggregateOffer` inline di
`tours/from-bali/[slug]/page.tsx` dan `tours/from-surabaya/[slug]/page.tsx`.
Diganti baca `schema-output.json` PDP terkait — pola baru untuk kedua file
ini (belum pernah baca ekosistem json-ld sebelumnya untuk PDP, karena
filenya belum ada).

## Trigger — regenerasi otomatis

Tidak ada workflow baru. Ditambahkan sebagai step di ujung workflow yang
sudah ada:

- **`.github/workflows/sync-google-reviews.yml`** — tambah step regenerasi
  schema rating + review setelah sync review selesai (harian).
- **`.github/workflows/sync-booking-data.yml`** — tambah step regenerasi
  schema TouristTrip/Offer setelah sync booking selesai. **Cron 6-jam
  dihapus** dari workflow ini (keputusan user: trigger real-time dari
  `EcosystemSync::notify()` di kedua repo Laravel + cron jam 8 pagi WIB
  sudah cukup sebagai jaring pengaman, 6-jam jadi redundan).

Kedua regenerasi memanggil ulang bagian relevan dari
`npm run render:web-content` (atau fungsi generator barunya secara
langsung) — commit hasilnya mengikuti pola commit-jika-berubah yang sudah
ada di kedua workflow.

## Error handling

Kalau ekosistem tidak terjangkau saat jvto-web build/render (mis. insiden
repo public/private yang berulang sesi ini): halaman tetap tayang **tanpa**
node yang bersangkutan (rating/review/trip hilang dari `@graph`, bukan
seluruh halaman gagal). `checkNoZeroRatings` di
`scripts/validate-schema.mjs` tetap jadi jaring pengaman supaya rating
0/kosong tidak pernah ter-emit dari sisi ekosistem sendiri.

## Testing

- Ekosistem: setiap generator baru dapat unit test (node.js
  `assert/strict`, pola yang sama dengan generator booking-sync) — kasus:
  data lengkap, data kosong/hilang (skip graceful, bukan crash), field
  wajib schema.org ada.
- `scripts/validate-schema.mjs` — pastikan `checkNoZeroRatings`,
  `checkNoDuplicateSingletons`, `checkDanglingReferences` tetap lolos
  setelah 3 jenis node baru ini masuk ke `@graph`.
- jvto-web: setelah kode lama dihapus, build lokal (`next build`) +
  `npm run validate:jsonld-schema` untuk memastikan tidak ada node yang
  hilang/dobel di halaman yang terdampak.
- Verifikasi live manual (pola yang sudah dipakai sesi ini): `curl`
  langsung ke halaman production setelah deploy, cek `@type` yang
  diharapkan muncul di HTML — bukan cuma percaya build sukses.

## Urutan implementasi (garis besar, detail di implementation plan)

1. Ekosistem: `buildOrganizationNode()` + rating (Bagian 1) — paling
   kecil, jadi fondasi untuk 2 bagian lain.
2. Ekosistem: generator Review nodes (Bagian 2).
3. Ekosistem: generator TouristTrip/Offer + 17 file baru (Bagian 3).
4. Ekosistem: wiring trigger ke 2 workflow yang sudah ada.
5. jvto-web: hapus kode perakit lama, ganti baca ekosistem — per bagian,
   diverifikasi live satu-satu sebelum lanjut ke bagian berikutnya (bukan
   sekali hapus semua lalu berharap semuanya benar).

Urutan ini sengaja: ekosistem harus sudah punya output yang benar sebelum
jvto-web berhenti merakitnya sendiri — supaya tidak ada jendela waktu di
mana kedua sisi sama-sama tidak merakit node tersebut.
