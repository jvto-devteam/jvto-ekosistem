# Roadmap Eksekusi JVTO Operating Ecosystem - 2026-08-12

Dokumen ini adalah versi ready to implement dan ready to handoff dari roadmap JVTO Operating Ecosystem. Dokumen ini memakai audit `docs/internal-systems-verification-2026-08-12.md` sebagai baseline.

Tujuan utama: membuat `jvto-ekosistem` menjadi lapisan operasi yang bisa dipakai untuk keputusan produk, booking, operasional, channel partner, review, profit, dan migrasi database dari MySQL hosting ke PostgreSQL VPS.

## 1. Ringkasan Untuk Handoff

### Konteks Sistem Saat Ini

- Project legacy, `new-backoffice`, dan database operasional saat ini berada di hosting.
- VPS saat ini menjalankan website dan menyimpan rancangan PostgreSQL untuk target migrasi dari MySQL hosting.
- PostgreSQL VPS bukan operational truth saat ini. Sampai cutover, operational truth tetap MySQL hosting dan `new-backoffice`.
- `jvto-ekosistem` adalah folder/workspace untuk menyusun knowledge, product, booking, ops, experience, analytics, review, dan migration readiness.

### Target Akhir

Sistem dianggap siap jika:

- data public dan internal dipisahkan jelas;
- source of truth tiap domain terdokumentasi;
- PostgreSQL target migrasi punya model lifecycle/event yang siap menampung riwayat operasional;
- integrasi KLOOK, Xendit, WhatsApp, review, booking, expense, dan profit punya mapping yang jelas;
- data ekosistem tervalidasi otomatis;
- handoff ke dev/ops/data bisa dilakukan tanpa bergantung pada riwayat chat.

### Prinsip Utama

- Jangan menganggap PostgreSQL VPS sebagai operational truth sebelum migration cutover.
- Jangan membuat placeholder seolah data sudah ada.
- Jika data belum ada, tandai sebagai `missing`, `unknown`, `not_required`, `partner_managed`, `pending_guest`, atau `pending_ops`.
- Semua data yang berasal dari DB/API harus mencantumkan sumber, tanggal sync, dan status freshness.
- Semua data internal harus dianggap sensitif sampai diputuskan aman untuk public.

## 2. Role Dan Tanggung Jawab

Gunakan role di bawah sebagai acuan. Nama orang bisa diisi kemudian.

| Role | Tanggung jawab utama | Output |
| --- | --- | --- |
| Owner / Boss | Keputusan bisnis, prioritas, public/internal exposure, status package | Decision log |
| Product Lead | Product/package truth, channel package mapping, package 86 | Product source-of-truth |
| Ops Lead | Booking readiness, crew, vehicle, hotel, incident, scheduler hosting | Ops workflow map |
| Finance Lead | Profit canonical, expense, payment status, refund/fee/commission rules | Finance mapping |
| Developer | Schema, migration model, validation scripts, app changes | Code and schema |
| DevOps | VPS, firewall, PM2, Nginx, logging, deploy policy | Infra runbook |
| Data Engineer | MySQL to PostgreSQL mapping, sync, diff report, data validation | Migration report |
| Content / Trust Lead | Review, evidence, policy, public knowledge, crew evidence | Review/evidence files |

## 3. Dependency Penting

Jangan mulai phase lanjutan sebelum dependency ini jelas.

| Dependency | Dibutuhkan untuk | Status saat ini |
| --- | --- | --- |
| Akses hosting MySQL operational DB | Rekonsiliasi data dan migrasi | Perlu dikonfirmasi |
| Akses `new-backoffice` production/hosting | Booking, expense, scheduler, operational truth | Perlu dikonfirmasi |
| Akses VPS | Website, PostgreSQL target, PM2, Nginx | Sudah ada |
| Keputusan package 86 | Product source-of-truth | Belum diputuskan |
| Keputusan public/internal explorer | Keamanan data ekosistem | Belum diputuskan |
| KLOOK production mode | Partner readiness | Perlu audit |
| Review authority | Review/crew evidence | DB/Google sync sementara lebih fresh |

## 4. Definition Of Done Global

Roadmap ini dianggap selesai jika semua syarat berikut terpenuhi:

- Ada dokumen arsitektur yang membedakan hosting operational truth dan VPS migration target.
- PostgreSQL VPS tidak terbuka bebas ke public internet.
- Package index memiliki status final untuk 16 vs 17 paket, termasuk package 86.
- Channel product map menjelaskan JVTO direct, KLOOK, TWT, GetYourGuide, Viator, custom, dan unknown.
- Lifecycle/event schema tersedia untuk booking, payment, communication, inquiry, quotation, incident, dan review request.
- Ada migration diff report antara hosting MySQL/new-backoffice dan PostgreSQL target.
- KLOOK `testMode`, `/api/octo/pdf`, availability, dan package mapping sudah diputuskan.
- Profit dashboard atau file analytics memakai profit backoffice sebagai canonical field.
- Review files memakai source review paling fresh dan setiap featured review punya reference.
- Validasi JSON/schema/source freshness bisa dijalankan berulang.
- Handoff package berisi dokumen, schema, runbook, checklist, dan known issues.

## 5. Decision Log Yang Harus Diisi

Isi bagian ini sebelum implementasi besar dilakukan.

| ID | Keputusan | Opsi | Owner | Status | Catatan |
| --- | --- | --- | --- | --- | --- |
| D-001 | Status package 86 | active / archived / backoffice-only | Owner + Product Lead | Open | DB/live API 17, snapshot main 16 |
| D-002 | Public explorer | tetap public / basic auth / split public-internal | Owner + DevOps | Open | Internal booking/ops data sensitif |
| D-003 | PostgreSQL exposure | restrict IP / VPN only / private bind | DevOps + Owner | Open | Port 5432 saat audit terbuka public |
| D-004 | Scheduler source | hosting only / VPS after cutover | Ops Lead + DevOps | Open | Legacy saat ini di hosting |
| D-005 | KLOOK mode | sandbox / production | Product Lead + Developer | Open | Response berisi `testMode: true` |
| D-006 | Review authority | DB Google sync / generated snapshot / manual export | Content Lead | Open | DB lebih fresh saat audit |
| D-007 | Profit authority | backoffice profit / calculated profit | Finance Lead + Owner | Owner instructed backoffice profit | Gunakan data apa adanya |

## 6. Phase 0 - Klarifikasi Operasional, Keamanan VPS, Dan Evidence Lock

Prioritas: P0.

Tujuan: memastikan roadmap tidak salah target antara hosting dan VPS, serta mengamankan fondasi VPS sebelum migrasi.

### Work Package 0.1 - Dokumen Arsitektur Hosting vs VPS

Owner: DevOps + Data Engineer.

Langkah implementasi:

1. Buat dokumen ringkas yang menjelaskan:
   - hosting berisi legacy, `new-backoffice`, dan MySQL operational DB;
   - VPS berisi website dan PostgreSQL target migrasi;
   - kapan PostgreSQL boleh dianggap operational truth;
   - sistem mana yang menghasilkan booking, expense, review, payment, dan scheduler saat ini.
2. Update dokumen audit dan roadmap jika ada koreksi host/path.
3. Catat akses yang tersedia dan belum tersedia.

Deliverable:

- `docs/current-system-architecture-and-migration-boundary.md`
- update ke `docs/internal-systems-verification-2026-08-12.md` jika diperlukan.

Acceptance criteria:

- Tidak ada dokumen yang menyebut PostgreSQL VPS sebagai satu-satunya DB operasional saat ini.
- Tim baru bisa membaca dokumen dan tahu data mana berasal dari hosting, VPS, repo, atau API.

### Work Package 0.2 - Amankan PostgreSQL VPS

Owner: DevOps.

Langkah implementasi:

1. Audit port PostgreSQL di VPS.
2. Tentukan IP/VPN yang boleh mengakses.
3. Update UFW atau konfigurasi PostgreSQL agar `5432` tidak terbuka untuk semua.
4. Tes koneksi dari IP yang diizinkan dan dari IP luar.
5. Catat rollback plan.

Deliverable:

- `docs/vps-postgresql-access-policy.md`
- catatan command yang dijalankan, tanpa password/token.

Acceptance criteria:

- `5432/tcp` tidak lagi terbuka bebas.
- Akses migrasi tetap bisa dilakukan dari lokasi yang disetujui.
- Tidak ada secret yang ditulis ke repo.

### Work Package 0.3 - Scheduler Hosting Inventory

Owner: Ops Lead + DevOps.

Langkah implementasi:

1. Cek scheduler di hosting, bukan otomatis di VPS.
2. Catat command yang berjalan, misalnya `php artisan schedule:run`, cron path, user, dan frekuensi.
3. Cocokkan dengan command Laravel:
   - trip information;
   - trip media;
   - crew reminders;
   - payment reminders;
   - Bali reminders;
   - Google review sync.
4. Catat lokasi log dan failure behavior.

Deliverable:

- `docs/hosting-scheduler-inventory.md`

Acceptance criteria:

- Scheduler owner jelas.
- Tim tahu command mana yang berjalan di hosting dan mana yang belum.
- Tidak ada rencana memasang scheduler di VPS sebelum migration cutover.

### Work Package 0.4 - Redaksi Production Logging

Owner: Developer + DevOps.

Langkah implementasi:

1. Cari raw `console.log`, server log, atau debug output yang mencetak object booking/customer.
2. Ganti dengan structured log yang hanya berisi:
   - request id;
   - route;
   - status;
   - error code;
   - booking id yang sudah di-mask jika diperlukan.
3. Deploy perubahan melalui workflow yang disepakati.
4. Cek PM2 logs setelah deploy.

Deliverable:

- Pull request atau commit di repo website terkait.
- `docs/production-logging-policy.md`

Acceptance criteria:

- PM2 log tidak mencetak nama customer, phone, email, pickup detail, full booking code, atau payment payload.
- Error operasional masih bisa ditelusuri.

## 7. Phase 1 - Rekonsiliasi Source Of Truth

Prioritas: P0/P1.

Tujuan: membuat aturan final tentang data mana yang menjadi acuan per domain.

### Work Package 1.1 - Source Of Truth Matrix

Owner: Data Engineer + Owner.

Buat matrix berikut dan isi dengan sumber aktual.

| Domain | Operational truth saat ini | Migration target | Public/API source | Catatan |
| --- | --- | --- | --- | --- |
| Product/package | Hosting/new-backoffice atau repo yang disepakati | PostgreSQL packages | `/api/packages/web` | Perlu putusan package 86 |
| Booking | MySQL hosting/new-backoffice | PostgreSQL bookings | backoffice API | 415 record di PostgreSQL target |
| Expense/profit | new-backoffice | PostgreSQL finance/expense mapping | expense API | Profit canonical dari backoffice |
| Review | Google sync/DB source terbaru | PostgreSQL reviews | generated snapshot jika fresh | 148 Google, 56 media |
| Crew | operational/backoffice source | PostgreSQL crew_members | ecosystem review alias | Perlu alias map |
| Scheduler | hosting | VPS hanya setelah cutover | n/a | Perlu inventory |

Deliverable:

- `docs/source-of-truth-matrix.md`

Acceptance criteria:

- Setiap domain punya satu source utama.
- Jika ada konflik, escalation owner jelas.

### Work Package 1.2 - Package 86 Dan Active Package Count

Owner: Owner + Product Lead.

Langkah implementasi:

1. Bandingkan package list dari:
   - hosting/new-backoffice operational source;
   - PostgreSQL target;
   - live public API;
   - generated snapshot `jvto-web main`;
   - file ecosystem package index.
2. Tentukan status package 86:
   - `active`;
   - `archived`;
   - `backoffice-only`;
   - `migration-only`.
3. Update file terkait.

File yang mungkin diubah:

- `2-product-and-commercial-core/tour-products/package-index.json`
- package contract terkait package 86;
- pricing rule terkait package 86;
- channel availability terkait package 86;
- itinerary/output terkait package 86;
- `docs/jvto-web-main-sync-2026-08-11.md`

Acceptance criteria:

- Tidak ada lagi konflik 16 vs 17 tanpa catatan.
- Package 86 memiliki status eksplisit di semua file turunan.

### Work Package 1.3 - Channel Product Map

Owner: Product Lead + Data Engineer.

Langkah implementasi:

1. Buat file channel product map.
2. Isi minimal:
   - JVTO direct package ID;
   - KLOOK package ID `82`, `83`, `84`;
   - TWT sebagai channel tanpa package ID;
   - GetYourGuide dan Viator sebagai planned/trust signal atau connector aktif;
   - unknown/observed IDs seperti package `94` jika masih muncul.
3. Tambahkan status: `direct`, `klook_only`, `twt_custom`, `planned_channel`, `unknown`, `deprecated`.

Deliverable:

- `2-product-and-commercial-core/channel-availability/channel-product-map.json`

Acceptance criteria:

- Booking partner tidak terlihat sebagai data rusak hanya karena package ID berbeda atau null.
- Analytics bisa membedakan direct product, channel-only product, dan custom booking.

### Work Package 1.4 - Public/Internal Exposure Rule

Owner: Owner + DevOps + Developer.

Langkah implementasi:

1. Klasifikasikan folder menjadi:
   - public safe;
   - internal;
   - restricted;
   - archive;
   - migration only.
2. Putuskan apakah explorer `ekosistem`:
   - tetap public;
   - diberi basic auth;
   - dipisah menjadi public explorer dan internal explorer.
3. Tambahkan metadata exposure per folder/file.

Deliverable:

- `docs/public-internal-exposure-policy.md`
- optional: `exposure.manifest.json`

Acceptance criteria:

- File booking, payment, pickup, hotel, crew assignment, dan ops tidak terekspos public tanpa keputusan owner.
- Explorer punya aturan render atau access yang jelas.

## 8. Phase 2 - Lifecycle Dan Event Model PostgreSQL

Prioritas: P1.

Tujuan: membuat model data yang siap menyimpan riwayat operasional, bukan hanya status terakhir.

### Work Package 2.1 - Event Taxonomy

Owner: Data Engineer + Ops Lead + Developer.

Buat taxonomy event:

| Event group | Contoh event | Entity utama |
| --- | --- | --- |
| Booking | created, confirmed, rescheduled, cancelled, completed | booking |
| Payment | invoice_created, payment_link_sent, paid, partial_paid, refund_created | booking/payment |
| Communication | whatsapp_sent, email_sent, portal_viewed, manual_note_added | booking/customer |
| Inquiry | inquiry_created, quote_requested, abandoned_checkout, converted | inquiry/booking |
| Quotation | quote_created, quote_revised, quote_accepted, quote_expired | quotation |
| Operations | crew_assigned, vehicle_assigned, hotel_confirmed, pickup_changed | booking |
| Incident | incident_opened, mitigation_added, resolved, refund_required | incident/booking |
| Review | request_sent, reminder_sent, review_received, review_linked | review/booking/crew |

Deliverable:

- `docs/lifecycle-event-taxonomy.md`

Acceptance criteria:

- Event names konsisten.
- Setiap event punya actor, source, timestamp, related entity, dan payload minimal.

### Work Package 2.2 - Schema Draft

Owner: Developer + Data Engineer.

Minimal field untuk setiap event:

```json
{
  "id": "evt_...",
  "eventType": "booking.confirmed",
  "entityType": "booking",
  "entityId": "booking-id",
  "sourceSystem": "hosting_mysql|new_backoffice|jvto_web|xendit|klook|manual",
  "occurredAt": "2026-08-12T00:00:00+07:00",
  "actorType": "system|staff|customer|partner",
  "actorId": null,
  "previousState": {},
  "nextState": {},
  "payload": {},
  "sensitivity": "internal",
  "createdAt": "2026-08-12T00:00:00+07:00"
}
```

File yang diubah:

- `schemas/operations.schema.json`
- `schemas/booking.schema.json`
- `schemas/examples/event.template.json`

Acceptance criteria:

- Schema bisa divalidasi.
- Event tidak wajib menyimpan raw PII.
- Event bisa dibuat dari data historis maupun realtime ke depan.

### Work Package 2.3 - Migration Mapping Dari MySQL Ke PostgreSQL

Owner: Data Engineer.

Langkah implementasi:

1. Ambil daftar tabel dan kolom dari MySQL hosting.
2. Bandingkan dengan PostgreSQL target.
3. Buat mapping:
   - table source;
   - column source;
   - target table;
   - target column;
   - transform rule;
   - nullable behavior;
   - data quality issue.
4. Tandai field yang tidak punya target.
5. Tandai target field yang tidak bisa diisi dari source saat ini.

Deliverable:

- `docs/mysql-to-postgresql-migration-map.md`
- optional: `migration/mysql-to-postgresql-map.json`

Acceptance criteria:

- Setiap core domain punya mapping: package, booking, customer, finance, payment, logistics, crew, vehicle, hotel, review.
- Data yang hilang ditandai, bukan dipaksa.

## 9. Phase 3 - Hardening KLOOK Dan Partner Channel

Prioritas: P1.

Tujuan: memastikan channel partner siap dipakai sebagai alur operasional dan siap dimigrasikan.

### Work Package 3.1 - KLOOK Production Readiness

Owner: Product Lead + Developer.

Checklist:

- [ ] Pastikan apakah `testMode: true` harus tetap atau diubah.
- [ ] Verifikasi `/api/octo/products`.
- [ ] Verifikasi `/api/octo/products/{id}`.
- [ ] Verifikasi `/api/octo/availability/calendar`.
- [ ] Verifikasi `/api/octo/availability`.
- [ ] Verifikasi `/api/octo/bookings`.
- [ ] Verifikasi confirm/cancel booking.
- [ ] Verifikasi `/api/octo/pdf?booking=...` atau ubah delivery URL.
- [ ] Hilangkan hardcoded supplier/delivery value jika seharusnya config.
- [ ] Catat auth mechanism tanpa membuka token.

Deliverable:

- `docs/klook-production-readiness.md`

Acceptance criteria:

- Setiap endpoint punya status: pass, fail, not tested, not applicable.
- Semua fail punya owner dan next action.

### Work Package 3.2 - Partner Channel Strategy

Owner: Owner + Product Lead.

Keputusan yang perlu diambil:

- KLOOK adalah connector aktif atau hanya ingestion channel?
- GetYourGuide akan menjadi connector aktif atau hanya review/trust signal?
- Viator akan menjadi connector aktif atau hanya review/trust signal?
- TWT tetap custom/no package ID atau perlu canonical product map?

Deliverable:

- `docs/partner-channel-strategy.md`

Acceptance criteria:

- Tidak ada channel yang muncul di dashboard tanpa status.
- Setiap channel punya owner, source data, dan target behavior.

## 10. Phase 4 - Profit Dan Operations Intelligence

Prioritas: P1/P2.

Tujuan: membuat profit dan readiness bisa dipakai untuk keputusan, dengan data apa adanya.

### Work Package 4.1 - Profit Source Contract

Owner: Finance Lead + Data Engineer.

Aturan:

- `financial.profit` dari backoffice adalah canonical profit.
- `invoiceMinusExpense` hanya comparison/audit metric.
- Jangan menghitung ulang profit sebagai truth kecuali owner mengubah keputusan.

Deliverable:

- `docs/profit-source-contract.md`

Acceptance criteria:

- Semua file analytics menjelaskan sumber profit.
- Tidak ada dashboard yang menyebut invoice-minus-expense sebagai profit canonical.

### Work Package 4.2 - Readiness State Model

Owner: Ops Lead + Developer.

State yang digunakan:

- `confirmed`
- `missing`
- `unknown`
- `not_required`
- `partner_managed`
- `pending_guest`
- `pending_ops`

Domain readiness:

- pickup;
- dropoff;
- hotel;
- room;
- guide;
- driver;
- vehicle;
- payment;
- health certificate;
- trip media;
- review request.

Deliverable:

- update `4-operations-core/trip-readiness/readiness-signals.json`
- update `4-operations-core/trip-readiness/booking-readiness-gap-report.json`

Acceptance criteria:

- Ops gap bisa dibedakan antara benar-benar missing dan memang tidak dibutuhkan.
- Partner-managed data tidak dianggap error.

## 11. Phase 5 - Review Engine Dan Crew Evidence

Prioritas: P2.

Tujuan: membuat review menjadi evidence yang bisa dipakai untuk homepage, crew profile, trust proof, dan learning loop.

### Work Package 5.1 - Review Source Refresh

Owner: Content Lead + Data Engineer.

Langkah implementasi:

1. Tentukan source review paling fresh.
2. Refresh review records.
3. Refresh review media.
4. Pastikan setiap Google review punya reference URL jika tersedia.
5. Jangan overwrite data fresh dengan generated snapshot lama.

Deliverable:

- `5-experience-engine/reviews/google-review-records.json`
- `5-experience-engine/reviews/google-review-media-records.json`
- `docs/review-source-freshness.md`

Acceptance criteria:

- Review count, media count, source date, dan reference rule tertulis.
- Featured review tidak menggunakan review tanpa source/reference.

### Work Package 5.2 - Crew Alias And Featured Evidence

Owner: Content Lead + Ops Lead.

Langkah implementasi:

1. Maintain alias group:
   - Rendi/Rendy;
   - Fredy/Freddy/Fredi;
   - Boy/Ahboy;
   - alias lain dari data review.
2. Pilih featured review per crew berdasarkan:
   - rating tinggi;
   - review detail;
   - mention crew jelas;
   - ada media jika memungkinkan;
   - punya original reference.
3. Link review ke package hanya jika ada evidence yang cukup.

Deliverable:

- `5-experience-engine/reviews/google-review-crew-alias-reconciliation.json`
- `5-experience-engine/reviews/crew-featured-review-evidence.json`

Acceptance criteria:

- Review count crew memakai alias group.
- Featured review punya original reference.
- Jika package inference digunakan, confidence dan alasan matching ditulis.

## 12. Phase 6 - Validation Dan Build Gate

Prioritas: P2.

Tujuan: membuat ekosistem bisa dicek otomatis dan aman untuk handoff.

### Work Package 6.1 - Data Validation Script

Owner: Developer.

Validasi minimal:

- semua JSON parse;
- schema-backed files valid;
- required source metadata ada;
- missing data memakai classification;
- active package count dibandingkan antar source;
- public/internal exposure rule dicek;
- migration diff report tersedia.

Deliverable:

- `scripts/validate-ecosystem-data.mjs`
- npm script di `package.json`, misalnya `npm run validate:data`
- `docs/validation-and-build-gate.md`

Acceptance criteria:

- Satu command validasi bisa dijalankan oleh tim baru.
- Error validation menjelaskan file, field, dan alasan.

### Work Package 6.2 - Handoff Package

Owner: Developer + Data Engineer.

Handoff package minimal:

- roadmap ini;
- audit internal systems;
- source-of-truth matrix;
- migration map;
- event taxonomy;
- validation guide;
- known issues;
- decision log;
- runbook VPS;
- runbook hosting scheduler;
- data refresh guide.

Deliverable:

- `docs/handoff-package-index.md`

Acceptance criteria:

- Rekan kerja bisa membaca satu index dan tahu dokumen mana yang harus dibuka.
- Rekan kerja bisa menjalankan validasi dan memahami failure.
- Rekan kerja tahu mana yang boleh diubah dan mana yang butuh keputusan owner.

## 13. Urutan Implementasi Yang Disarankan

Jalankan dalam urutan berikut.

1. Phase 0.1: dokumen arsitektur hosting vs VPS.
2. Phase 0.2: amankan PostgreSQL VPS.
3. Phase 0.3: scheduler hosting inventory.
4. Phase 1.1: source-of-truth matrix.
5. Phase 1.2: keputusan package 86.
6. Phase 1.3: channel product map.
7. Phase 1.4: public/internal exposure rule.
8. Phase 2.1: event taxonomy.
9. Phase 2.2: schema draft.
10. Phase 2.3: MySQL to PostgreSQL migration map.
11. Phase 3.1: KLOOK production readiness.
12. Phase 3.2: partner channel strategy.
13. Phase 4.1: profit source contract.
14. Phase 4.2: readiness state model.
15. Phase 5.1: review source refresh.
16. Phase 5.2: crew alias and featured evidence.
17. Phase 6.1: data validation script.
18. Phase 6.2: handoff package.

## 14. Ready To Implement Checklist

Sebelum mulai implementasi:

- [ ] Owner menyetujui pemisahan hosting vs VPS.
- [ ] Akses hosting MySQL/new-backoffice tersedia untuk audit/mapping.
- [ ] Akses VPS tersedia untuk DevOps.
- [ ] Keputusan package 86 dijadwalkan.
- [ ] Keputusan public/internal explorer dijadwalkan.
- [ ] PIC tiap work package ditunjuk.
- [ ] Tidak ada secret yang akan ditulis ke repo.

Saat implementasi:

- [ ] Semua file baru mencantumkan source dan tanggal.
- [ ] Semua data internal diberi classification.
- [ ] Semua perubahan schema punya contoh payload.
- [ ] Semua konflik data dicatat di decision log.
- [ ] Semua command berisiko punya rollback plan.

Setelah implementasi:

- [ ] Validasi JSON/schema lolos.
- [ ] Source-of-truth matrix lengkap.
- [ ] Migration map tersedia.
- [ ] Event taxonomy dan schema tersedia.
- [ ] KLOOK readiness punya status per endpoint.
- [ ] Handoff package index tersedia.

## 15. Template Status Mingguan

Gunakan format ini untuk update ke owner.

```md
## JVTO Operating Ecosystem Weekly Status - YYYY-MM-DD

### Selesai
- ...

### Sedang berjalan
- ...

### Keputusan yang dibutuhkan
- ...

### Risiko
- ...

### Data conflict
- ...

### Rencana minggu depan
- ...
```

## 16. Risiko Dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Menganggap PostgreSQL VPS sebagai operational truth terlalu cepat | Migrasi salah arah | Selalu bandingkan dengan hosting MySQL/new-backoffice |
| Public explorer membuka data internal | Data operasional terekspos | Basic auth atau split public/internal |
| Package 86 tidak diputuskan | Product count terus konflik | Decision D-001 wajib selesai awal |
| KLOOK `testMode` tidak jelas | Connector partner tidak siap produksi | KLOOK readiness audit |
| Profit dihitung ulang tanpa aturan | Dashboard menyesatkan | Backoffice profit sebagai canonical |
| Review snapshot lama overwrite data fresh | Evidence melemah | Source freshness rule |
| Scheduler dipasang di host salah | Reminder/automation dobel atau mati | Scheduler inventory hosting |
| Port PostgreSQL tetap public | Risiko keamanan | Restrict IP/VPN/private bind |

## 17. Catatan Handoff

Hal yang harus dijelaskan ke rekan kerja:

- Jangan mulai dari coding lifecycle dulu sebelum source-of-truth matrix dan migration boundary jelas.
- Jangan mengubah data operational truth tanpa konfirmasi owner.
- Jangan mengekspos folder internal ke public explorer tanpa policy.
- Jangan menyimpan secret, token, raw customer data, atau payload pembayaran ke repo.
- Jika menemukan data yang tidak cocok antara hosting, PostgreSQL, API, dan snapshot, buat entry di decision log, bukan memilih diam-diam.
