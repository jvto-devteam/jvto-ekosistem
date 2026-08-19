# Booking Data Sync Pipeline — Design Spec

Tanggal: 2026-08-19
Status: approved, ready for implementation plan

## Goal

Booking data di ekosistem ini (`archive/` raw snapshot + 24 file turunan (revisi, lihat bagian Generator layer) yang
tersebar di `2-product-and-commercial-core/`, `3-booking-and-journey-core/`,
`4-operations-core/`, `5-experience-engine/`) sekarang statis — di-fetch dan
ditulis manual, terakhir 2026-08-07. Tujuan pipeline ini: booking data selalu
sinkron dengan backoffice tanpa campur tangan manual, dipicu near-real-time
setiap ada booking dibuat/diubah/dihapus.

## Scope

Ini scope untuk repo `jvto-ekosistem` saja (sisi consumer/sync). Perubahan di
sisi Laravel (`legacy`/`new-backoffice`) — hook yang mengirim event — dikerjakan
terpisah oleh pemilik repo tersebut, tidak termasuk implementation plan dari
spec ini. Kontrak antara dua sisi didefinisikan di bagian "Trigger contract"
di bawah.

## Data sources

Tiga endpoint publik (tidak perlu autentikasi — sudah diverifikasi langsung):

1. `GET https://new-backoffice.javavolcano-touroperator.com/booking-overview/api?json=true&filter_type=month&month=YYYY-MM`
   — list semua booking dalam 1 bulan.
2. `GET https://legacy.javavolcano-touroperator.com/bookings/details/{slug}?json=true`
   — detail 1 booking (slug = bagian akhir URL `customer_portal` pada record
   booking-overview).
3. `GET https://new-backoffice.javavolcano-touroperator.com/finance/expense-manager/{bookingId}/internal/api`
   — breakdown expense 1 booking.

Karena filter bulanan, sync job memanggil endpoint #1 dua kali tiap run —
bulan berjalan dan bulan berikutnya (booking maju biasanya sudah ada sebelum
tanggal mulainya) — lalu menggabungkan hasilnya sebelum proses diff. Ini
mencegah booking untuk bulan depan yang baru dibuat ikut terlewat saat
mendekati pergantian bulan.

## Archive layout (raw, tidak diubah bentuknya — hanya ditulis otomatis)

```
archive/booking-overview-snapshot/
  booking-overview.raw.json       # overwrite tiap run
  headers.txt                     # overwrite tiap run
  sync-manifest.json              # NEW — hash per booking_id, dipakai buat diff run berikutnya
  sync-report.json                # NEW — hasil diff run terakhir (added/removed/updated/unchanged)

archive/customer-portal-detail-snapshot/
  fetch-manifest.json             # overwrite tiap run
  details/{slug}.raw.json         # ditambah untuk booking baru, dihapus untuk booking yang hilang,
                                   # ditimpa untuk booking yang berubah
```

Tidak ada folder raw baru untuk expense — expense tetap langsung ke
`booking-expense-records.json` (lihat generator list), karena repo ini tidak
pernah punya raw archive terpisah untuk expense sebelumnya dan tidak ada yang
bergantung padanya.

## Generator layer (revisi 2026-08-19 sore, setelah riset field-mapping)

Setelah riset detail (baca isi asli tiap file + trace field-by-field ke raw
archive), scope generator layer berubah dari rencana awal. Bagian di bawah
ini menggantikan draft awal.

### 24 generator murni yang bisa dibangun, dengan dependency graph

Bukan 25 fungsi independen — ada 3 tingkat, harus di-generate berurutan:

**Tier A — langsung dari raw archive (7 file, tidak saling bergantung):**
```
3-booking-and-journey-core/booking/booking-records.json          [FOUNDATION — tier B bergantung ke ini]
3-booking-and-journey-core/booking/customer-portal-booking-details.json
3-booking-and-journey-core/pickup-and-dropoff/customer-portal-logistics.json
2-product-and-commercial-core/routes-and-itineraries/customer-portal-itinerary-records.json
4-operations-core/hotel-and-partner-confirmation/customer-portal-accommodation-records.json
4-operations-core/crew-assignment/customer-portal-crew-records.json
4-operations-core/vehicle-assignment/customer-portal-vehicle-records.json
5-experience-engine/guest-portal/customer-portal-detail-records.json
5-experience-engine/guest-portal/guest-portal-records.json
5-experience-engine/knowledge-feed/customer-portal-faq-packing-feed.json
```
(10 file — semua baca `archive/customer-portal-detail-snapshot/details/*.raw.json`
langsung, kecuali `booking-records.json` dan `guest-portal-records.json` yang
baca `archive/booking-overview-snapshot/booking-overview.raw.json` langsung.)

**Tier B — bergantung ke `booking-records.json` (11 file, generate setelah Tier A):**
```
3-booking-and-journey-core/booking/booking-summary.json
3-booking-and-journey-core/booking/package-usage-summary.json
3-booking-and-journey-core/payments/payment-summary.json
3-booking-and-journey-core/travelers/country-pax-summary.json
3-booking-and-journey-core/pickup-and-dropoff/pickup-dropoff-records.json
3-booking-and-journey-core/health-requirements/ijen-health-requirements-by-booking.json
4-operations-core/hotel-and-partner-confirmation/hotel-confirmation-records.json
4-operations-core/crew-assignment/crew-roster-from-bookings.json
4-operations-core/crew-assignment/crew-assignment-records.json
4-operations-core/trip-readiness/booking-readiness-records.json
4-operations-core/trip-readiness/booking-readiness-gap-report.json
```

**Tier C — bergantung ke output Tier B/lain (2 file):**
```
5-experience-engine/analytics/booking-channel-payment-readiness-summary.json
  (bisa juga dihitung langsung dari raw archive, tapi source_refs asli menunjuk ke
   beberapa file Tier B — ikuti pola itu)
5-experience-engine/analytics/profitability-summary.json
  (bergantung ke booking-expense-records.json, lihat di bawah)
```

**Tier D — perlu fetch live baru yang belum ada (1 file):**
```
4-operations-core/expense-management/booking-expense-records.json
```
Field identitas & `overviewExpenseTotal`/`overviewCrewExpense`/`overviewDebtExpense`/
`profit`/`plotting` bisa dihitung dari `booking-overview.raw.json` saja (tidak perlu
fetch baru). Tapi `lineItems[]`, `totalsByCategory`, `detailLineTotal`,
`detailDebtLineTotal`, `overviewVsDetailDelta` **hanya** bisa didapat dari live call
`GET .../finance/expense-manager/{bookingId}/internal/api` (endpoint publik #3,
sudah diverifikasi bisa diakses langsung sejak awal spec ini) — sync engine yang
sudah dibangun (Plan 1) sengaja tidak fetch endpoint ini. Perlu ditambahkan:
`fetchExpenseRecord(bookingId)` baru di `scripts/lib/booking-sync/fetch.mjs`, dan
generator ini yang memanggilnya per-booking saat generate (bukan di-archive
terpisah — sesuai keputusan awal, tidak ada folder raw baru untuk expense).
Endpoint ini tidak archived, jadi harus siap partial-failure per booking (field
`errors[]`/`summary.errorCount` di file ini sudah didesain untuk itu).

### 5 file yang TIDAK bisa/tidak akan di-generate otomatis (revisi dari rencana awal)

Rencana awal bilang "4 generator dengan join ke master data lokal". Riset
membuktikan itu salah — keempatnya bukan fungsi murni dari booking data:

```
3-booking-and-journey-core/pickup-and-dropoff/pickup-contexts.json
  BLOCKED: bergantung ke seed/manual-overrides/pickup-dropoff.yaml yang TIDAK ADA
  di repo. Sub-field `backoffice_observed`-nya juga sudah basi (rujuk package_id
  47 yang sudah tidak ada di raw archive sekarang).
3-booking-and-journey-core/pickup-and-dropoff/dropoff-contexts.json
  BLOCKED: sama persis (seed YAML yang sama, backoffice_observed basi juga).
4-operations-core/vehicle-assignment/vehicle-plans.json
  SALAH JOIN TARGET: sumber aslinya archive/jvto-web-main-snapshot/publicContent-
  generated/packageDetailSnapshots.json (dedup vehiclePlan per package), BUKAN
  transport-master.json — tidak ada hubungan ke booking data sama sekali.
4-operations-core/trip-readiness/operational-context-index.json
  BLOCKED: passthrough murni dari proses resolusi eksternal ("Phase 5") di repo
  jvto-web yang tidak ada script/rules-nya di sini. Tidak ada booking data yang
  masuk sama sekali, bahkan tidak ada backoffice_observed-style layer.
```

Ditambah 1 file yang ternyata cuma **sebagian** bisa di-generate:

```
3-booking-and-journey-core/booking/product-reconciliation.json
  PARTIAL: daftar package_id kandidat "channel-specific" (single-channel non-JVTO)
  memang bisa dihitung otomatis (cross-tab package_id x orderChannel), tapi label
  klasifikasi ("confirmed" vs "needs confirmation") dan narrative text
  (decisionStatus/recommendedNextStep/note) adalah keputusan manual manusia yang
  tidak ada sinyal datanya. Keputusan: file ini TIDAK di-generate otomatis —
  masuk kategori "manual" seperti payment-methods.json, bukan generator.
```

Total generator otomatis: **24 file** (10 Tier A + 11 Tier B + 2 Tier C +
1 Tier D), bukan 29.

Di luar scope (bukan data booking / tidak deterministik / butuh input yang
tidak ada di repo, tetap manual seperti sekarang):

```
3-booking-and-journey-core/payments/payment-methods.json
3-booking-and-journey-core/pickup-and-dropoff/my-booking-portal-fields.json
3-booking-and-journey-core/booking/product-reconciliation.json
3-booking-and-journey-core/pickup-and-dropoff/pickup-contexts.json
3-booking-and-journey-core/pickup-and-dropoff/dropoff-contexts.json
4-operations-core/vehicle-assignment/vehicle-plans.json
4-operations-core/trip-readiness/operational-context-index.json
```

### Scoping: cakupan booking mana yang di-generate

File-file lama (2026-08-07) di-filter ke "booking bulan Agustus 2026 yang sudah
ada saat itu" (74 dari yang sekarang 136). Itu bukan aturan yang disengaja,
cuma kebetulan itu isi raw archive saat itu. Keputusan untuk generator baru:
**generate dari SEMUA booking yang ada di raw archive saat ini** (tidak ada
filter tanggal tambahan) — konsisten dengan tujuan "selalu up to date", dan
raw archive sendiri sudah dibatasi ke bulan berjalan+berikutnya oleh sync
engine (Plan 1). Konsekuensinya: output generator akan terlihat sangat
berbeda dari versi lama (136 record vs 74, Agustus+September vs cuma
Agustus) — ini yang diharapkan/benar, bukan bug.

## Architecture

```
[Laravel: legacy / new-backoffice]  (di luar scope repo ini)
  insert/update/delete function -> EcosystemSync::notify($bookingId, $action)
        |
        v  POST /repos/{owner}/jvto-ekosistem/dispatches
           event_type: booking-changed
           client_payload: { booking_id, action }
        |
        v
[GitHub Actions: jvto-ekosistem]
  .github/workflows/sync-booking-data.yml
  trigger: repository_dispatch(booking-changed) OR schedule(cron, fallback tiap 6 jam) OR workflow_dispatch(manual)
  concurrency: group "booking-sync", run diantre (tidak paralel)
        |
        v
  scripts/sync-booking-data.mjs
    1. fetch booking-overview (bulan berjalan)
    2. hash tiap booking_id, bandingkan ke sync-manifest.json lama
       -> { added[], removed[], updated[], unchanged: N }
    3. untuk added+updated: fetch customer-portal-detail (by slug) + expense (by bookingId)
    4. untuk removed: hapus archive/customer-portal-detail-snapshot/details/{slug}.raw.json
    5. tulis archive/ (raw + sync-manifest.json + sync-report.json)
    6. jalankan 24 generator (urut per tier, lihat Generator layer) -> tulis ulang file turunan dari raw archive terbaru
    7. jika ada perubahan nyata di working tree -> git commit + push ke main
       jika tidak ada perubahan -> skip commit (tidak ada commit kosong)
```

## Trigger contract (kontrak dengan sisi Laravel)

GitHub `repository_dispatch` yang harus dikirim dari Laravel:

```
POST https://api.github.com/repos/{owner}/jvto-ekosistem/dispatches
Authorization: Bearer <fine-grained PAT, scope: Contents read/write pada repo ini>
Accept: application/vnd.github+json
Body:
{
  "event_type": "booking-changed",
  "client_payload": { "booking_id": 3390, "action": "created" }
}
```

`client_payload` tidak dipakai untuk apa pun oleh sync job (job selalu fetch +
diff ulang dari sumbernya, bukan percaya payload) — dikirim hanya untuk
logging/debugging. Ini sengaja supaya sync job tetap benar walau event dikirim
duplikat, telat, atau out-of-order.

## Perubahan ke workflow yang sudah ada

`.github/workflows/deploy-vps.yml` — tambah `paths-ignore` di trigger `push`
supaya commit dari sync job tidak memicu full deploy ke VPS (data booking
tidak pernah dirender ke website publik):

```yaml
on:
  push:
    branches:
      - main
    paths-ignore:
      - 'archive/booking-overview-snapshot/**'
      - 'archive/customer-portal-detail-snapshot/**'
      - '3-booking-and-journey-core/**'
      - '4-operations-core/**'
  workflow_dispatch:
```

Ini murni tambahan (additive) — behavior untuk semua path lain tidak berubah.

## File baru yang dibuat

```
.github/workflows/sync-booking-data.yml
scripts/sync-booking-data.mjs              # entrypoint: fetch + diff + archive + panggil semua generator
scripts/lib/booking-sync/fetch.mjs         # 3 fungsi fetch (booking-overview, customer-portal-detail, expense)
scripts/lib/booking-sync/manifest.mjs      # hash + diff logic (added/removed/updated)
scripts/lib/booking-sync/generators/*.mjs  # 24 modul generator (Tier A/B/C/D), 1 file = 1 fungsi = 1 output
```

`package.json` — tambah script:
```json
"sync:booking": "node scripts/sync-booking-data.mjs",
"sync:booking:dry-run": "node scripts/sync-booking-data.mjs --dry-run"
```

## Error handling

- Sisi Laravel: job dikirim lewat queue (fire-and-forget), gagal kirim ke
  GitHub tidak boleh mem-block operasi insert/update/delete booking. Retry
  otomatis (3x, backoff).
- Sisi GitHub Actions: kalau fetch API upstream gagal di tengah proses, job
  gagal total tanpa commit apa pun — state repo terakhir yang valid tetap
  utuh. Fallback cron (tiap 6 jam) akan mencoba lagi otomatis.
- Duplikat/burst event: aman karena `concurrency: group` mengantre run, dan
  run yang tidak menemukan perubahan (`sync-report.json` semua unchanged)
  berhenti sebelum commit — murah untuk dijalankan berulang.

## Testing strategy

- 29 fungsi generator: unit test dengan fixture raw archive kecil, assert
  output cocok dengan shape file yang sekarang ada di repo.
- `manifest.mjs`: unit test skenario added/removed/updated/unchanged dengan
  data buatan.
- `scripts/sync-booking-data.mjs --dry-run`: fetch + diff + generate tanpa
  commit — dipakai untuk verifikasi manual sebelum dipasang ke Actions, dan
  untuk debugging kalau ada masalah di produksi.
- Sisi Laravel diverifikasi manual (`gh api repos/.../dispatches`) sebelum
  hook `EcosystemSync::notify()` dipasang ke fungsi insert/update/delete asli.

## Commit strategy

Direct commit ke `main` oleh job (pakai `GITHUB_TOKEN` bawaan Actions,
permission `contents: write`). Tidak lewat PR — supaya data benar-benar
tercermin near-real-time, bukan menunggu review manual.

## Known drift: Layer-1 auto-refresh vs Layer-2 frozen snapshot

Begitu pipeline ini live, `archive/**` (booking-overview + customer-portal
detail) di-refresh otomatis tiap ada event booking dan minimal tiap 6 jam lewat
cron. Sementara itu, 24 file turunan yang didaftarkan di bagian "Generator
layer" di atas **tetap beku** pada snapshot terakhir kali file-file itu
di-generate (2026-08-07), sampai plan generator-layer yang terpisah itu
dikerjakan dan di-ship.

Artinya untuk sementara: Layer-1 (raw archive) fresh, Layer-2 (file turunan)
stale, dan keduanya bisa saling tidak cocok. Ini kondisi yang diterima,
sifatnya sementara, dan sekarang terdokumentasi — bukan bug. Jangan pakai file
turunan sebagai sumber kebenaran booking data sampai generator layer live;
pakai `archive/**` langsung.

## Out of scope / follow-up

- Implementasi hook Laravel (`EcosystemSync`, job, daftar fungsi
  insert/update/delete) — dikerjakan terpisah oleh pemilik repo
  legacy/new-backoffice, di luar repo ini.
- Optimisasi "skip file turunan yang tidak terpengaruh perubahan" (regenerate
  parsial, bukan semua Tier A/B/C/D generator tiap run) — tidak masuk versi
  pertama; regenerate semua generator tiap ada perubahan sudah cukup cepat
  untuk skala data ini (~74 booking/bulan).
