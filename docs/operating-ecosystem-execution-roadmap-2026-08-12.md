# Roadmap Eksekusi JVTO Operating Ecosystem - 2026-08-12

Dokumen ini mengubah hasil audit di `docs/internal-systems-verification-2026-08-12.md` menjadi rencana kerja yang bisa dieksekusi. Tujuannya adalah mengubah `jvto-ekosistem` dari folder dokumentasi menjadi lapisan operasi yang bisa membantu keputusan produk, booking, operasional, channel partner, review, dan profit.

## Posisi Saat Ini

Fakta yang sudah diverifikasi:

- Arsitektur saat ini sudah diklarifikasi owner: project legacy, `new-backoffice`, dan database operasional saat ini berada di hosting.
- VPS saat ini dipakai untuk website dan rancangan PostgreSQL ke depan untuk migrasi dari MySQL hosting ke PostgreSQL VPS.
- Database PostgreSQL `jvto-web` di sisi VPS/migrasi bisa diakses dan memiliki 119 tabel publik.
- Data inti untuk produk, booking, logistics, finance, crew, vehicle, content, policy, WhatsApp log, dan review sudah ada di repository, endpoint, dan database PostgreSQL target migrasi yang dicek.
- Database PostgreSQL target migrasi memiliki 415 record booking, terdiri dari 185 booking KLOOK, 146 JVTO direct, dan 84 The Window Travel.
- Public package API mengembalikan 17 paket, sedangkan snapshot `jvto-web main` yang sudah diimpor ke ekosistem saat ini memperlakukan 16 paket sebagai paket publik aktif.
- Data Google review memiliki 148 review Google, 56 di antaranya memiliki media, dan 148 memiliki original reference URL.
- Kode connector KLOOK/OCTO ada di aplikasi Laravel legacy.
- Kode Xendit dan automasi WhatsApp ada di aplikasi Laravel legacy.
- Service VPS berjalan melalui Nginx dan PM2.

Gap yang sudah diverifikasi:

- Tabel first-class untuk lifecycle, event, inquiry, quotation, communication, dan incident belum ditemukan di database PostgreSQL target migrasi yang dicek.
- `booking_reviews` dan `booking_review_crews` di PostgreSQL target migrasi masih kosong, walaupun public review sudah ada.
- Integrasi KLOOK perlu dicek kesiapan produksinya.
- VPS memiliki risiko website/runtime dan migration-DB: PostgreSQL terbuka publik, restart historis `jvto-web` tinggi, production working tree kotor, dan log produksi masih mencetak payload berbentuk booking/customer.

## Prinsip Roadmap

- Stabilkan sistem yang sedang berjalan sebelum menambah logic produk baru.
- Pisahkan public knowledge dan internal operating data dengan jelas.
- Selama belum cutover, hosting MySQL/new-backoffice tetap dianggap sebagai operational truth saat ini.
- PostgreSQL VPS diperlakukan sebagai target migrasi dan desain database ke depan, bukan satu-satunya operational truth saat ini.
- Jika PostgreSQL, live API, dan generated snapshot berbeda, konflik tersebut harus direkonsiliasi sebelum migration cutover.
- Tambahkan struktur lifecycle/event sebelum membuat dashboard yang bergantung pada kebenaran workflow.
- Jangan mengisi data kosong dengan placeholder. Tandai secara eksplisit sebagai `unknown`, `not_required`, `partner_managed`, `pending`, atau `missing`.

## Phase 0 - Klarifikasi Operasional, Keamanan VPS, Dan Penguncian Evidence

Prioritas: P0.

Target hasil: posisi hosting vs VPS terdokumentasi jelas, environment live lebih aman, dan evidence saat ini terkunci sebagai baseline untuk membandingkan perubahan berikutnya.

### Item Kerja

1. Dokumentasikan pemisahan hosting dan VPS.
   - Kondisi saat ini: owner sudah mengklarifikasi bahwa legacy, `new-backoffice`, dan DB operasional berjalan di hosting, sedangkan VPS berisi website dan rancangan PostgreSQL migrasi.
   - Aksi: catat pemisahan ini sebagai aturan arsitektur di audit, roadmap, dan dokumen migrasi.
   - Kriteria selesai: tidak ada lagi dokumen yang menyebut PostgreSQL VPS sebagai satu-satunya DB operasional saat ini.

2. Batasi akses PostgreSQL VPS.
   - Kondisi saat ini: PostgreSQL listen di `0.0.0.0:5432` dan UFW mengizinkan `5432/tcp` dari mana saja.
   - Aksi: batasi `5432/tcp` hanya untuk IP/VPN terpercaya, atau bind PostgreSQL ke interface lokal/private.
   - Kriteria selesai: akses eksternal bebas ke port `5432` tidak lagi terbuka sebelum PostgreSQL menjadi target migrasi yang kritikal.

3. Dokumentasikan scheduler Laravel di hosting.
   - Kondisi saat ini: Laravel legacy memiliki scheduled commands, tetapi VPS yang dicek tidak menunjukkan `php artisan schedule:run`; ini masuk akal karena legacy operasional berada di hosting.
   - Aksi: temukan dan dokumentasikan scheduler di hosting: command path, frekuensi, log, dan owner.
   - Kriteria selesai: ada satu owner scheduler yang terdokumentasi di hosting. Tidak perlu memasang scheduler di VPS kecuali saat migration cutover.

4. Hentikan raw logging payload booking/customer di production website.
   - Kondisi saat ini: PM2 out log `jvto-web` berisi object berbentuk booking/customer.
   - Aksi: hapus atau redact raw production log.
   - Kriteria selesai: log tetap menyimpan error operasional, tetapi tidak mengekspos nama customer, booking code, phone, email, pickup detail, atau payment payload.

5. Simpan snapshot source-of-truth saat ini.
   - Aksi: pertahankan dokumen audit dan roadmap ini di `docs/`.
   - Kriteria selesai: sync berikutnya memakai baseline ini, bukan mengandalkan ingatan atau chat.

### File Ekosistem Yang Terkait

- `docs/internal-systems-verification-2026-08-12.md`
- `docs/operating-ecosystem-execution-roadmap-2026-08-12.md`
- Nanti: `docs/pain-points-audit.md` jika ingin menggantikan audit lama yang masih berbasis snapshot 74 booking.

## Phase 1 - Rekonsiliasi Source Of Truth

Prioritas: P0/P1.

Target hasil: ekosistem tahu sumber data mana yang menang ketika hosting MySQL/new-backoffice, PostgreSQL target migrasi, public API, generated snapshot, dan data historis berbeda.

### Item Kerja

1. Putuskan otoritas jumlah paket.
   - Konflik: PostgreSQL target migrasi/live API menunjukkan 17 paket aktif/published; snapshot `jvto-web main` yang diimpor menunjukkan 16 paket publik aktif.
   - Keputusan yang dibutuhkan: package `86` harus dianggap aktif, archived, atau backoffice-only?
   - Kriteria selesai: `package-index.json` dan file turunan package `86` memiliki satu status yang eksplisit.

2. Tetapkan prioritas sumber review.
   - Kondisi saat ini: data Google review dari DB/PostgreSQL target migrasi lebih baru daripada generated review snapshot.
   - Keputusan: Google sync DB/review export menjadi sumber review utama untuk migration dataset, tetapi tetap perlu direkonsiliasi dengan operational source jika hosting menyimpan versi berbeda.
   - Kriteria selesai: file review mencantumkan source date, authority, dan freshness rule.

3. Tandai perilaku package per channel secara eksplisit.
   - Sudah dikonfirmasi owner: package ID `82`, `83`, `84` adalah package KLOOK; TWT tidak memakai package ID.
   - Sisa: package `94` yang terlihat di snapshot lama perlu diklasifikasikan jika masih relevan.
   - Kriteria selesai: channel product map menjelaskan hubungan direct, KLOOK, TWT, custom, dan unknown package.

4. Pisahkan eksposur public dan internal.
   - Kondisi saat ini: public explorer menampilkan file operasional internal.
   - Keputusan yang dibutuhkan: tetap public, tambah auth, atau pisahkan folder public/internal.
   - Kriteria selesai: record operasional sensitif tidak lagi otomatis dianggap sebagai public website content.

### File Ekosistem Yang Terkait

- `2-product-and-commercial-core/tour-products/package-index.json`
- `2-product-and-commercial-core/channel-availability/booking-channel-policy.json`
- File channel map baru atau file channel map existing di `2-product-and-commercial-core/channel-availability/`
- `5-experience-engine/reviews/google-review-records.json`
- `5-experience-engine/reviews/google-review-media-records.json`
- `docs/jvto-web-main-sync-2026-08-11.md`

## Phase 2 - Lifecycle Dan Event Model

Prioritas: P1.

Target hasil: rancangan PostgreSQL migrasi JVTO memiliki lapisan event yang bisa menjelaskan apa yang terjadi pada booking, bukan hanya status terakhirnya.

### Tabel Atau Collection Yang Perlu Dirancang

1. `booking_events`
   - Booking dibuat, confirmed, rescheduled, cancelled, completed.
   - Terhubung ke booking, actor, source system, timestamp, previous state, dan next state.

2. `payment_events`
   - Invoice dibuat, payment link dikirim, payment paid, partial payment, refund, outstanding reminder.
   - Terhubung ke Xendit invoice/payment history jika tersedia.

3. `communication_logs`
   - WhatsApp, email, portal, phone, manual note.
   - Menyimpan metadata dan summary, bukan raw conversation sensitif secara default.

4. `inquiries`
   - Lead sebelum booking, abandoned checkout, website contact, partner inquiry.
   - Terhubung ke booking jika berhasil convert.

5. `quotations`
   - Versi quotation, channel, package, pax, pricing, inclusions, expiry, status accepted/rejected.

6. `incident_logs`
   - Guest issue, operational disruption, closure, injury/health issue, refund case, supplier issue.

7. `review_requests`
   - Request review pasca trip dikirim, channel, timing, review diterima, review linked, crew mentioned.

### Kriteria Selesai

- Setiap object lifecycle memiliki stable ID, source system, timestamp, owner, dan related booking jika relevan.
- Field status booking existing tetap dipakai, tetapi tidak lagi menjadi satu-satunya riwayat.
- Ekosistem bisa menjawab: "apa yang terjadi, kapan, siapa/apa pemicunya, dan apa yang berubah?"
- Model event bisa dimigrasikan dari data hosting MySQL/new-backoffice tanpa kehilangan konteks.

### File Ekosistem Yang Terkait

- `schemas/booking.schema.json`
- `schemas/operations.schema.json`
- `schemas/examples/event.template.json`
- `3-booking-and-journey-core/lifecycle-status/`
- `3-booking-and-journey-core/communication-log/`
- `3-booking-and-journey-core/inquiry/`
- `3-booking-and-journey-core/quotation/`
- `3-booking-and-journey-core/review-request/`
- `4-operations-core/incident-log/`
- `4-operations-core/operational-events/`

## Phase 3 - Hardening KLOOK Dan Partner Channel

Prioritas: P1.

Target hasil: partner channel direpresentasikan sebagai sistem operasional, bukan hanya badge marketing atau nama order channel.

### Item Kerja KLOOK

1. Konfirmasi `testMode`.
   - Kondisi saat ini: response KLOOK/OCTO berisi `testMode: true`.
   - Kriteria selesai: terdokumentasi sebagai sandbox mode yang disengaja, atau diubah untuk produksi.

2. Verifikasi `/api/octo/pdf`.
   - Kondisi saat ini: ticket delivery URL mengarah ke `/api/octo/pdf?booking=...`, tetapi route yang cocok belum ditemukan di route yang dicek.
   - Kriteria selesai: route tersedia dan mengembalikan ticket/voucher valid, atau delivery URL diganti.

3. Verifikasi availability proxy.
   - Kondisi saat ini: log produksi menunjukkan OCTO availability proxy `ECONNRESET`.
   - Kriteria selesai: health check membuktikan availability endpoint reachable dan stabil.

4. Pindahkan nilai supplier/delivery yang hardcoded ke config atau data.
   - Kriteria selesai: value terdokumentasi dan bisa diubah tanpa edit booking logic.

5. Rekonsiliasi package ID KLOOK.
   - Kriteria selesai: ID `82`, `83`, `84` dipetakan secara eksplisit atau ditandai sebagai KLOOK-only product IDs.

6. Tentukan jalur migrasi KLOOK dari hosting ke PostgreSQL.
   - Kriteria selesai: field KLOOK legacy yang masih di MySQL hosting punya mapping jelas ke PostgreSQL target migrasi.

### Item Kerja GetYourGuide Dan Viator

- Konfirmasi apakah keduanya hanya trust/review/platform signal atau memang direncanakan sebagai booking channel.
- Jika direncanakan sebagai booking channel, definisikan kebutuhan connector sebelum menambah data placeholder.

## Phase 4 - Profit Dan Operations Intelligence

Prioritas: P1/P2.

Target hasil: ekosistem bisa mendukung keputusan manajemen memakai data booking dan expense nyata dari operational source saat ini, sambil menyiapkan mapping ke PostgreSQL target migrasi.

### Item Kerja

1. Tetapkan profit canonical dari field profit backoffice.
   - Instruksi owner: gunakan data apa adanya.
   - Kriteria selesai: dashboard memberi label jelas bahwa profit berasal dari backoffice/hosting operational source.

2. Pertahankan invoice-minus-expense sebagai pembanding audit.
   - Kriteria selesai: comparison tidak disalahlabeli sebagai canonical profit.

3. Tambahkan explainability hanya jika field nyata tersedia.
   - Commission, payment fee, refund, credit, overpayment, dan supplier-payment logic hanya dimodelkan dari sumber data nyata.

4. Tambahkan semantics untuk readiness state.
   - State: `missing`, `not_required`, `partner_managed`, `pending_guest`, `pending_ops`, `confirmed`, `unknown`.
   - Kriteria selesai: gap operasional tidak lagi terlihat seperti field kosong biasa jika sebenarnya partner-managed atau not required.

### File Ekosistem Yang Terkait

- `5-experience-engine/analytics/profitability-summary.json`
- `5-experience-engine/analytics/booking-channel-payment-readiness-summary.json`
- `4-operations-core/trip-readiness/booking-readiness-gap-report.json`
- `4-operations-core/trip-readiness/readiness-signals.json`
- `4-operations-core/expense-management/booking-expense-records.json`

## Phase 5 - Review Engine Dan Crew Evidence

Prioritas: P2.

Target hasil: review bisa dipakai sebagai evidence untuk reputasi crew, trust package, card homepage, dan pembelajaran pasca trip.

### Item Kerja

1. Perlakukan DB/Google sync sebagai authority review saat ini.
   - Kondisi terverifikasi: 148 Google review, 56 dengan media, 148 dengan reference URL.
   - Kriteria selesai: file review mencantumkan freshness source dan original reference link.

2. Pertahankan alias reconciliation.
   - Nama seperti Rendi/Rendy, Fredy/Freddy/Fredi, Boy/Ahboy harus tetap dipetakan.
   - Kriteria selesai: review count crew memakai alias group, bukan hanya exact name.

3. Hubungkan featured crew review ke review record asli.
   - Kriteria selesai: setiap featured review memiliki original review reference dan media reference jika media tersedia.

4. Buat lifecycle review request.
   - Kriteria selesai: status post-trip review request bisa dilacak dari booking, request dikirim, sampai review diterima.

### File Ekosistem Yang Terkait

- `5-experience-engine/reviews/google-review-records.json`
- `5-experience-engine/reviews/google-review-media-records.json`
- `5-experience-engine/reviews/google-review-crew-alias-reconciliation.json`
- `5-experience-engine/reviews/crew-featured-review-evidence.json`
- `3-booking-and-journey-core/review-request/`

## Phase 6 - Validation Dan Build Gate

Prioritas: P2.

Target hasil: data ekosistem tidak lagi hanya file kurasi manual, tetapi memiliki validasi yang bisa diulang.

### Item Kerja

1. Tambahkan validasi JSON untuk record yang punya schema.
2. Tambahkan source freshness check untuk snapshot dari DB/API.
3. Tambahkan validasi klasifikasi missing data.
4. Tambahkan report yang gagal jika aturan public/internal exposure dilanggar.
5. Tambahkan report yang membandingkan active package count antara DB, public API, dan package index ekosistem.
6. Tambahkan report migrasi yang membandingkan hosting operational source dengan PostgreSQL target migrasi.

### Kriteria Selesai

- Semua file JSON berhasil di-parse.
- Record yang punya schema berhasil divalidasi.
- Gap yang sudah diketahui ditandai secara sengaja, bukan dibiarkan kosong diam-diam.
- Public explorer tidak bisa mengekspos file internal sensitif baru tanpa terdeteksi.
- Perbedaan antara hosting MySQL/new-backoffice dan PostgreSQL target migrasi terlihat jelas sebelum cutover.

## Urutan Eksekusi

Urutan yang direkomendasikan:

1. Phase 0: klarifikasi operasional, keamanan VPS, dan penguncian evidence.
2. Phase 1: rekonsiliasi source of truth.
3. Phase 2: lifecycle/event model.
4. Phase 3: hardening KLOOK.
5. Phase 4: profit dan operations intelligence.
6. Phase 5: review engine dan crew evidence.
7. Phase 6: validation dan build gate.

Alasan: pemisahan hosting vs VPS harus jelas dulu agar roadmap tidak salah target. Keamanan migration DB melindungi fondasi ke depan. Keputusan source-of-truth mencegah kerja ganda. Lifecycle/event model membuka jalan untuk operating ecosystem yang benar-benar bisa dipakai saat migrasi.

## Checklist Langsung

- [ ] Putuskan status package `86`: active, archived, atau backoffice-only.
- [ ] Putuskan apakah public explorer tetap sepenuhnya public atau memakai access control/internal split.
- [ ] Dokumentasikan bahwa hosting MySQL/new-backoffice adalah operational truth saat ini.
- [ ] Konfirmasi scheduler Laravel legacy di hosting, bukan otomatis di VPS.
- [ ] Batasi akses PostgreSQL publik di VPS.
- [ ] Hapus raw logging payload booking/customer dari production.
- [ ] Buat draft lifecycle schema untuk booking, payment, communication, inquiry, quotation, incident, dan review request events.
- [ ] Verifikasi KLOOK `testMode`, `/api/octo/pdf`, dan availability proxy.
- [ ] Refresh file review ekosistem dari sumber Google/DB yang paling baru.
