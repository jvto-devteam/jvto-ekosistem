# Booking Data Sync Pipeline — Design Spec

Tanggal: 2026-08-19
Status: approved, ready for implementation plan

## Goal

Booking data di ekosistem ini (`archive/` raw snapshot + 29 file turunan yang
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

## Generator layer (29 file turunan, physical JSON, auto-regenerate + commit)

25 generator murni (baca raw archive saja):

```
3-booking-and-journey-core/booking/booking-records.json
3-booking-and-journey-core/booking/booking-summary.json
3-booking-and-journey-core/booking/customer-portal-booking-details.json
3-booking-and-journey-core/booking/package-usage-summary.json
3-booking-and-journey-core/booking/product-reconciliation.json
3-booking-and-journey-core/payments/payment-summary.json
3-booking-and-journey-core/travelers/country-pax-summary.json
3-booking-and-journey-core/pickup-and-dropoff/pickup-dropoff-records.json
3-booking-and-journey-core/pickup-and-dropoff/customer-portal-logistics.json
3-booking-and-journey-core/health-requirements/ijen-health-requirements-by-booking.json
2-product-and-commercial-core/routes-and-itineraries/customer-portal-itinerary-records.json
4-operations-core/hotel-and-partner-confirmation/customer-portal-accommodation-records.json
4-operations-core/hotel-and-partner-confirmation/hotel-confirmation-records.json
4-operations-core/crew-assignment/customer-portal-crew-records.json
4-operations-core/crew-assignment/crew-roster-from-bookings.json
4-operations-core/crew-assignment/crew-assignment-records.json
4-operations-core/vehicle-assignment/customer-portal-vehicle-records.json
4-operations-core/trip-readiness/booking-readiness-records.json
4-operations-core/trip-readiness/booking-readiness-gap-report.json
5-experience-engine/guest-portal/customer-portal-detail-records.json
5-experience-engine/guest-portal/guest-portal-records.json
5-experience-engine/knowledge-feed/customer-portal-faq-packing-feed.json
5-experience-engine/analytics/booking-channel-payment-readiness-summary.json
5-experience-engine/analytics/profitability-summary.json
4-operations-core/expense-management/booking-expense-records.json
```

(Catatan: 24 di atas + `booking-expense-records.json` = 25.)

4 generator dengan join ke master data lokal (sudah ada di repo, tidak perlu
fetch baru — hanya dibaca saat generate):

```
3-booking-and-journey-core/pickup-and-dropoff/pickup-contexts.json
  join -> archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/01-pickup-contexts.json
3-booking-and-journey-core/pickup-and-dropoff/dropoff-contexts.json
  join -> archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/ (dropoff family)
4-operations-core/vehicle-assignment/vehicle-plans.json
  join -> 4-operations-core/vehicle-assignment/transport-master.json
4-operations-core/trip-readiness/operational-context-index.json
  join -> archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/operational-context-index.json
```

Di luar scope (bukan data booking, dokumen statis, tetap manual seperti
sekarang):

```
3-booking-and-journey-core/payments/payment-methods.json
3-booking-and-journey-core/pickup-and-dropoff/my-booking-portal-fields.json
```

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
    6. jalankan 29 generator -> tulis ulang 29 file turunan dari raw archive terbaru
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
scripts/lib/booking-sync/generators/*.mjs  # 29 modul generator, 1 file = 1 fungsi = 1 output
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

## Out of scope / follow-up

- Implementasi hook Laravel (`EcosystemSync`, job, daftar fungsi
  insert/update/delete) — dikerjakan terpisah oleh pemilik repo
  legacy/new-backoffice, di luar repo ini.
- Optimisasi "skip file turunan yang tidak terpengaruh perubahan" (regenerate
  parsial, bukan semua 25/29 generator tiap run) — tidak masuk versi
  pertama; regenerate semua generator tiap ada perubahan sudah cukup cepat
  untuk skala data ini (~74 booking/bulan).
