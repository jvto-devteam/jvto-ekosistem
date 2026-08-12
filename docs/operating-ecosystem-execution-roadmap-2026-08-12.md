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

## 9. Spesifikasi Implementasi Database PostgreSQL

Bagian ini adalah acuan langsung untuk developer saat membuat migration PostgreSQL. Nama tabel dan kolom di bawah sengaja dibuat eksplisit agar tidak perlu menebak dari roadmap.

### Prinsip Desain Database

- Gunakan `bigserial` untuk primary key internal agar selaras dengan banyak tabel PostgreSQL JVTO yang sudah memakai `bigint`.
- Gunakan `public_id text unique` untuk ID stabil yang aman dipakai di event, API, file JSON, dan handoff.
- Jangan simpan raw PII di event payload kecuali benar-benar perlu. Simpan summary, metadata, dan reference.
- Semua tabel workflow harus punya `source_system`, `source_record_id`, `created_at`, dan `updated_at`.
- Semua state yang belum pasti gunakan `unknown`, bukan string kosong.
- Semua JSON tambahan masuk ke `metadata jsonb`, bukan kolom random yang tidak terdokumentasi.

### Enum Text Yang Dipakai

Gunakan `text` dengan `check constraint`, bukan PostgreSQL enum, agar migrasi lebih mudah.

Nilai `source_system`:

- `hosting_mysql`
- `new_backoffice`
- `jvto_web`
- `legacy_laravel`
- `xendit`
- `klook`
- `google`
- `manual`
- `migration_script`

Nilai `actor_type`:

- `system`
- `staff`
- `customer`
- `partner`
- `cron`
- `webhook`
- `migration`

Nilai `sensitivity`:

- `public`
- `internal`
- `restricted`
- `secret`

Nilai readiness:

- `confirmed`
- `missing`
- `unknown`
- `not_required`
- `partner_managed`
- `pending_guest`
- `pending_ops`

### Migration Order

Buat migration dalam urutan ini:

1. `operational_events`
2. `booking_events`
3. `payment_events`
4. `communication_logs`
5. `inquiries`
6. `quotations`
7. `quotation_items`
8. `incident_logs`
9. `incident_updates`
10. `review_requests`
11. `channel_product_map`
12. `source_sync_runs`
13. `migration_diff_reports`
14. `data_exposure_rules`
15. `booking_readiness_items`

Alasan urutan: `operational_events` menjadi event ledger umum. Tabel domain lain bisa menulis event spesifik dan tetap menaut ke ledger umum melalui `operational_event_id`.

### Tabel 1 - `operational_events`

Tujuan: ledger event umum untuk semua perubahan penting lintas booking, payment, communication, inquiry, quotation, incident, review, dan migration.

```sql
create table if not exists operational_events (
  id bigserial primary key,
  public_id text not null unique,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  booking_id bigint null references bookings(id) on delete set null,
  source_system text not null,
  source_record_id text,
  actor_type text not null default 'system',
  actor_id text,
  occurred_at timestamptz not null,
  previous_state jsonb not null default '{}'::jsonb,
  next_state jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'internal',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operational_events_source_system_check check (
    source_system in ('hosting_mysql','new_backoffice','jvto_web','legacy_laravel','xendit','klook','google','manual','migration_script')
  ),
  constraint operational_events_actor_type_check check (
    actor_type in ('system','staff','customer','partner','cron','webhook','migration')
  ),
  constraint operational_events_sensitivity_check check (
    sensitivity in ('public','internal','restricted','secret')
  )
);

create index if not exists idx_operational_events_booking_id on operational_events(booking_id);
create index if not exists idx_operational_events_event_type on operational_events(event_type);
create index if not exists idx_operational_events_entity on operational_events(entity_type, entity_id);
create index if not exists idx_operational_events_occurred_at on operational_events(occurred_at);
create index if not exists idx_operational_events_source on operational_events(source_system, source_record_id);
create index if not exists idx_operational_events_payload_gin on operational_events using gin(payload);
```

Contoh `event_type`:

- `booking.created`
- `booking.confirmed`
- `booking.rescheduled`
- `payment.invoice_created`
- `payment.paid`
- `communication.whatsapp_sent`
- `ops.crew_assigned`
- `incident.opened`
- `review.request_sent`
- `review.received`
- `migration.record_imported`

Contoh insert:

```sql
insert into operational_events (
  public_id,
  event_type,
  entity_type,
  entity_id,
  booking_id,
  source_system,
  source_record_id,
  actor_type,
  occurred_at,
  next_state,
  payload,
  sensitivity
) values (
  'evt_booking_3642_confirmed_20260902',
  'booking.confirmed',
  'booking',
  '3642',
  3642,
  'klook',
  'klook-booking-uuid',
  'partner',
  '2026-09-02T11:00:00+07:00',
  '{"booking_status":"CONFIRMED"}',
  '{"channel":"KLOOK","source_note":"imported from partner booking"}',
  'internal'
);
```

Acceptance criteria:

- Setiap workflow table bisa menaut ke `operational_events`.
- Event bisa dicari berdasarkan booking, entity, source, dan waktu.
- Event tidak perlu menyimpan raw customer data.

### Tabel 2 - `booking_events`

Tujuan: event khusus perubahan lifecycle booking.

```sql
create table if not exists booking_events (
  id bigserial primary key,
  public_id text not null unique,
  operational_event_id bigint null references operational_events(id) on delete set null,
  booking_id bigint not null references bookings(id) on delete cascade,
  event_type text not null,
  previous_booking_status text,
  next_booking_status text,
  previous_trip_status text,
  next_trip_status text,
  previous_payment_status text,
  next_payment_status text,
  reason text,
  source_system text not null,
  source_record_id text,
  actor_type text not null default 'system',
  actor_id text,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_booking_events_booking_id on booking_events(booking_id);
create index if not exists idx_booking_events_event_type on booking_events(event_type);
create index if not exists idx_booking_events_occurred_at on booking_events(occurred_at);
create index if not exists idx_booking_events_status on booking_events(next_booking_status, next_trip_status, next_payment_status);
```

Contoh `event_type`:

- `booking.created`
- `booking.pending`
- `booking.confirmed`
- `booking.cancelled`
- `booking.rescheduled`
- `booking.completed`
- `booking.reopened`

Kolom wajib saat import:

- `public_id`
- `booking_id`
- `event_type`
- `source_system`
- `occurred_at`

Acceptance criteria:

- Perubahan `booking_status`, `trip_status`, dan `payment_status` tidak hanya overwrite field terakhir.
- Minimal satu `booking.created` atau `booking.imported` dibuat untuk setiap booking saat migrasi.

### Tabel 3 - `payment_events`

Tujuan: menyimpan lifecycle pembayaran, invoice, payment link, partial payment, paid, refund, dan reminder.

```sql
create table if not exists payment_events (
  id bigserial primary key,
  public_id text not null unique,
  operational_event_id bigint null references operational_events(id) on delete set null,
  booking_id bigint not null references bookings(id) on delete cascade,
  payment_history_id bigint null references booking_payment_histories(id) on delete set null,
  xendit_invoice_id text,
  event_type text not null,
  payment_status text,
  payment_method text,
  currency text not null default 'IDR',
  amount numeric(14,2),
  fee_amount numeric(14,2),
  net_amount numeric(14,2),
  due_at timestamptz,
  paid_at timestamptz,
  invoice_url_present boolean not null default false,
  source_system text not null,
  source_record_id text,
  actor_type text not null default 'system',
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'restricted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_events_booking_id on payment_events(booking_id);
create index if not exists idx_payment_events_xendit_invoice_id on payment_events(xendit_invoice_id);
create index if not exists idx_payment_events_event_type on payment_events(event_type);
create index if not exists idx_payment_events_paid_at on payment_events(paid_at);
```

Contoh `event_type`:

- `payment.invoice_created`
- `payment.link_sent`
- `payment.proof_uploaded`
- `payment.partial_paid`
- `payment.paid`
- `payment.failed`
- `payment.expired`
- `payment.refund_requested`
- `payment.refunded`
- `payment.reminder_sent`

Aturan:

- Jangan simpan full payment URL jika dianggap sensitif. Gunakan `invoice_url_present = true`.
- Jika URL perlu disimpan, simpan di `metadata.encrypted_reference` atau storage aman, bukan plain JSON public.
- `financial.profit` backoffice tetap canonical; tabel ini bukan untuk menghitung ulang profit tanpa keputusan owner.

### Tabel 4 - `communication_logs`

Tujuan: menyimpan log komunikasi tanpa menyimpan raw chat sensitif.

```sql
create table if not exists communication_logs (
  id bigserial primary key,
  public_id text not null unique,
  operational_event_id bigint null references operational_events(id) on delete set null,
  booking_id bigint null references bookings(id) on delete set null,
  customer_id bigint null,
  channel text not null,
  direction text not null,
  message_type text not null,
  template_key text,
  subject text,
  summary text,
  raw_body_stored boolean not null default false,
  external_message_id text,
  provider text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  source_system text not null,
  source_record_id text,
  actor_type text not null default 'system',
  sensitivity text not null default 'restricted',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_logs_channel_check check (
    channel in ('whatsapp','email','portal','phone','manual','partner_api','system')
  ),
  constraint communication_logs_direction_check check (
    direction in ('inbound','outbound','internal')
  )
);

create index if not exists idx_communication_logs_booking_id on communication_logs(booking_id);
create index if not exists idx_communication_logs_customer_id on communication_logs(customer_id);
create index if not exists idx_communication_logs_channel on communication_logs(channel);
create index if not exists idx_communication_logs_sent_at on communication_logs(sent_at);
create index if not exists idx_communication_logs_external_message_id on communication_logs(external_message_id);
```

Contoh `message_type`:

- `booking_confirmation`
- `payment_reminder`
- `trip_information`
- `trip_media`
- `crew_reminder`
- `bali_reminder`
- `customer_question`
- `manual_note`

Acceptance criteria:

- WhatsApp/email/portal activity bisa diaudit.
- Tidak ada raw conversation panjang di public explorer.
- Jika raw body harus disimpan, harus ada policy storage terpisah.

### Tabel 5 - `inquiries`

Tujuan: menyimpan lead sebelum booking, abandoned checkout, contact form, dan partner inquiry.

```sql
create table if not exists inquiries (
  id bigserial primary key,
  public_id text not null unique,
  source_system text not null,
  source_record_id text,
  inquiry_source text not null,
  customer_id bigint null,
  converted_booking_id bigint null references bookings(id) on delete set null,
  preferred_package_id bigint null references packages(id) on delete set null,
  preferred_channel text,
  travel_start_date date,
  travel_end_date date,
  pax_count integer,
  customer_country text,
  status text not null default 'new',
  qualification_status text not null default 'unknown',
  assigned_staff_id text,
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  converted_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'restricted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiries_status_check check (
    status in ('new','qualified','quoted','waiting_customer','converted','lost','spam','unknown')
  )
);

create index if not exists idx_inquiries_source on inquiries(source_system, source_record_id);
create index if not exists idx_inquiries_status on inquiries(status);
create index if not exists idx_inquiries_converted_booking_id on inquiries(converted_booking_id);
create index if not exists idx_inquiries_travel_dates on inquiries(travel_start_date, travel_end_date);
```

Acceptance criteria:

- Abandoned checkout dan pre-booking conversation bisa dimodelkan.
- Conversion inquiry ke booking bisa dihitung.
- Jika source data belum ada, tabel tetap siap tanpa fake data.

### Tabel 6 - `quotations`

Tujuan: menyimpan quotation dan revisinya.

```sql
create table if not exists quotations (
  id bigserial primary key,
  public_id text not null unique,
  inquiry_id bigint null references inquiries(id) on delete set null,
  booking_id bigint null references bookings(id) on delete set null,
  customer_id bigint null,
  package_id bigint null references packages(id) on delete set null,
  channel text not null default 'direct',
  quote_number text,
  version integer not null default 1,
  status text not null default 'draft',
  currency text not null default 'IDR',
  pax_count integer,
  travel_start_date date,
  travel_end_date date,
  subtotal_amount numeric(14,2),
  discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2),
  deposit_amount numeric(14,2),
  balance_amount numeric(14,2),
  valid_until timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  expired_at timestamptz,
  source_system text not null,
  source_record_id text,
  created_by text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'restricted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotations_status_check check (
    status in ('draft','sent','revised','accepted','rejected','expired','cancelled','unknown')
  )
);

create index if not exists idx_quotations_inquiry_id on quotations(inquiry_id);
create index if not exists idx_quotations_booking_id on quotations(booking_id);
create index if not exists idx_quotations_status on quotations(status);
create index if not exists idx_quotations_quote_number on quotations(quote_number);
```

### Tabel 7 - `quotation_items`

Tujuan: menyimpan line item quotation agar pricing bisa diaudit.

```sql
create table if not exists quotation_items (
  id bigserial primary key,
  quotation_id bigint not null references quotations(id) on delete cascade,
  item_type text not null,
  item_name text not null,
  description text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  total_price numeric(14,2) not null default 0,
  currency text not null default 'IDR',
  source_component text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotation_items_item_type_check check (
    item_type in ('package','addon','hotel','transport','guide','fee','discount','tax','custom','other')
  )
);

create index if not exists idx_quotation_items_quotation_id on quotation_items(quotation_id);
create index if not exists idx_quotation_items_item_type on quotation_items(item_type);
```

Acceptance criteria:

- Quote bisa punya versi.
- Quote accepted bisa ditautkan ke booking.
- Line item tidak hilang saat migrasi.

### Tabel 8 - `incident_logs`

Tujuan: menyimpan insiden operasional, guest issue, closure, refund case, supplier issue, dan safety issue.

```sql
create table if not exists incident_logs (
  id bigserial primary key,
  public_id text not null unique,
  booking_id bigint null references bookings(id) on delete set null,
  incident_type text not null,
  severity text not null default 'medium',
  status text not null default 'open',
  title text not null,
  summary text,
  occurred_at timestamptz,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  owner_staff_id text,
  customer_visible boolean not null default false,
  refund_required boolean not null default false,
  compensation_required boolean not null default false,
  root_cause text,
  resolution_summary text,
  source_system text not null,
  source_record_id text,
  metadata jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'restricted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint incident_logs_severity_check check (
    severity in ('low','medium','high','critical')
  ),
  constraint incident_logs_status_check check (
    status in ('open','investigating','mitigated','resolved','cancelled','unknown')
  )
);

create index if not exists idx_incident_logs_booking_id on incident_logs(booking_id);
create index if not exists idx_incident_logs_type on incident_logs(incident_type);
create index if not exists idx_incident_logs_status on incident_logs(status);
create index if not exists idx_incident_logs_severity on incident_logs(severity);
create index if not exists idx_incident_logs_occurred_at on incident_logs(occurred_at);
```

Contoh `incident_type`:

- `destination_closure`
- `weather_disruption`
- `health_issue`
- `guest_complaint`
- `vehicle_issue`
- `hotel_issue`
- `crew_issue`
- `partner_issue`
- `payment_issue`
- `refund_case`
- `safety_issue`

### Tabel 9 - `incident_updates`

Tujuan: audit trail update insiden.

```sql
create table if not exists incident_updates (
  id bigserial primary key,
  incident_id bigint not null references incident_logs(id) on delete cascade,
  operational_event_id bigint null references operational_events(id) on delete set null,
  update_type text not null,
  previous_status text,
  next_status text,
  message text,
  actor_type text not null default 'staff',
  actor_id text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'restricted',
  created_at timestamptz not null default now()
);

create index if not exists idx_incident_updates_incident_id on incident_updates(incident_id);
create index if not exists idx_incident_updates_occurred_at on incident_updates(occurred_at);
```

Acceptance criteria:

- Insiden punya status dan update history.
- Root cause dan resolution bisa dipakai untuk ops learning.

### Tabel 10 - `review_requests`

Tujuan: melacak request review pasca trip sampai review diterima dan ditautkan ke crew/package.

```sql
create table if not exists review_requests (
  id bigserial primary key,
  public_id text not null unique,
  booking_id bigint null references bookings(id) on delete set null,
  customer_id bigint null,
  review_id bigint null references reviews(id) on delete set null,
  package_id bigint null references packages(id) on delete set null,
  channel text not null default 'google',
  status text not null default 'not_sent',
  request_template_key text,
  requested_at timestamptz,
  reminder_count integer not null default 0,
  last_reminder_at timestamptz,
  received_at timestamptz,
  linked_at timestamptz,
  rating smallint,
  crew_mentions jsonb not null default '[]'::jsonb,
  media_present boolean not null default false,
  original_review_url text,
  source_system text not null,
  source_record_id text,
  metadata jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_requests_status_check check (
    status in ('not_sent','scheduled','sent','reminded','received','linked','failed','not_required','unknown')
  )
);

create index if not exists idx_review_requests_booking_id on review_requests(booking_id);
create index if not exists idx_review_requests_review_id on review_requests(review_id);
create index if not exists idx_review_requests_status on review_requests(status);
create index if not exists idx_review_requests_requested_at on review_requests(requested_at);
create index if not exists idx_review_requests_crew_mentions_gin on review_requests using gin(crew_mentions);
```

Acceptance criteria:

- `booking_reviews` kosong tidak lagi menjadi blind spot karena lifecycle request punya tabel sendiri.
- Review yang sudah diterima bisa ditautkan ke booking, package, dan crew.
- Original review URL tetap tersedia untuk evidence.

### Tabel 11 - `channel_product_map`

Tujuan: menjelaskan hubungan product direct JVTO, channel-only product, TWT custom, dan unknown package ID.

```sql
create table if not exists channel_product_map (
  id bigserial primary key,
  public_id text not null unique,
  channel text not null,
  channel_product_id text,
  channel_product_name text,
  canonical_package_id bigint null references packages(id) on delete set null,
  canonical_package_slug text,
  mapping_status text not null default 'unknown',
  confidence text not null default 'unknown',
  owner_note text,
  valid_from date,
  valid_to date,
  source_system text not null,
  source_record_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_product_map_status_check check (
    mapping_status in ('direct','klook_only','twt_custom','planned_channel','unknown','deprecated','backoffice_only')
  ),
  constraint channel_product_map_confidence_check check (
    confidence in ('confirmed','inferred','unknown','rejected')
  )
);

create index if not exists idx_channel_product_map_channel on channel_product_map(channel);
create index if not exists idx_channel_product_map_channel_product_id on channel_product_map(channel, channel_product_id);
create index if not exists idx_channel_product_map_package_id on channel_product_map(canonical_package_id);
```

Seed minimal:

```sql
insert into channel_product_map (
  public_id, channel, channel_product_id, mapping_status, confidence, owner_note, source_system
) values
  ('map_klook_82', 'KLOOK', '82', 'klook_only', 'confirmed', 'Owner confirmed package 82 is KLOOK package ID.', 'manual'),
  ('map_klook_83', 'KLOOK', '83', 'klook_only', 'confirmed', 'Owner confirmed package 83 is KLOOK package ID.', 'manual'),
  ('map_klook_84', 'KLOOK', '84', 'klook_only', 'confirmed', 'Owner confirmed package 84 is KLOOK package ID.', 'manual'),
  ('map_twt_null', 'The Window Travel', null, 'twt_custom', 'confirmed', 'Owner confirmed TWT does not use package ID.', 'manual')
on conflict (public_id) do nothing;
```

Acceptance criteria:

- KLOOK/TWT data tidak terlihat sebagai missing product.
- Package ID `94` jika muncul harus masuk sebagai `unknown` atau diputuskan owner.

### Tabel 12 - `source_sync_runs`

Tujuan: mencatat setiap sync dari hosting, API, Google review, atau generated snapshot.

```sql
create table if not exists source_sync_runs (
  id bigserial primary key,
  public_id text not null unique,
  source_system text not null,
  source_name text not null,
  source_url text,
  sync_type text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null default 'running',
  records_seen integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_failed integer not null default 0,
  checksum text,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint source_sync_runs_status_check check (
    status in ('running','success','partial','failed','cancelled')
  )
);

create index if not exists idx_source_sync_runs_source on source_sync_runs(source_system, source_name);
create index if not exists idx_source_sync_runs_started_at on source_sync_runs(started_at);
create index if not exists idx_source_sync_runs_status on source_sync_runs(status);
```

Acceptance criteria:

- Setiap dataset tahu kapan terakhir disync.
- Generated snapshot lama tidak bisa overwrite data fresh tanpa terlihat.

### Tabel 13 - `migration_diff_reports`

Tujuan: menyimpan hasil perbandingan hosting MySQL/new-backoffice dengan PostgreSQL target.

```sql
create table if not exists migration_diff_reports (
  id bigserial primary key,
  public_id text not null unique,
  domain text not null,
  source_system text not null,
  target_system text not null default 'postgresql_vps',
  source_count integer,
  target_count integer,
  matched_count integer,
  missing_in_target_count integer,
  extra_in_target_count integer,
  mismatch_count integer,
  status text not null default 'open',
  generated_at timestamptz not null default now(),
  summary text,
  diff_payload jsonb not null default '{}'::jsonb,
  owner text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint migration_diff_reports_status_check check (
    status in ('open','reviewing','accepted','resolved','ignored')
  )
);

create index if not exists idx_migration_diff_reports_domain on migration_diff_reports(domain);
create index if not exists idx_migration_diff_reports_status on migration_diff_reports(status);
create index if not exists idx_migration_diff_reports_generated_at on migration_diff_reports(generated_at);
```

Acceptance criteria:

- Tim bisa melihat gap migration per domain.
- Cutover tidak boleh dilakukan jika domain P0 masih punya unresolved mismatch.

### Tabel 14 - `data_exposure_rules`

Tujuan: menentukan folder/file mana yang public, internal, restricted, atau archive.

```sql
create table if not exists data_exposure_rules (
  id bigserial primary key,
  path_pattern text not null unique,
  exposure_level text not null,
  reason text,
  owner_role text,
  allowed_public boolean not null default false,
  requires_auth boolean not null default true,
  contains_pii boolean not null default false,
  contains_payment_data boolean not null default false,
  contains_operational_data boolean not null default false,
  review_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_exposure_rules_level_check check (
    exposure_level in ('public','internal','restricted','archive','migration_only')
  )
);

create index if not exists idx_data_exposure_rules_level on data_exposure_rules(exposure_level);
create index if not exists idx_data_exposure_rules_flags on data_exposure_rules(contains_pii, contains_payment_data, contains_operational_data);
```

Seed minimal:

```sql
insert into data_exposure_rules (
  path_pattern, exposure_level, reason, allowed_public, requires_auth, contains_operational_data
) values
  ('1-knowledge-and-evidence-core/**', 'public', 'Stable public knowledge and evidence after review.', true, false, false),
  ('2-product-and-commercial-core/**', 'internal', 'Product/commercial rules need owner review before public exposure.', false, true, false),
  ('3-booking-and-journey-core/**', 'restricted', 'Booking-level operational records.', false, true, true),
  ('4-operations-core/**', 'restricted', 'Crew, vehicle, hotel, incident, and readiness records.', false, true, true),
  ('5-experience-engine/reviews/**', 'internal', 'Review evidence can be public only after source and media review.', false, true, false),
  ('archive/**', 'archive', 'Historical source snapshots.', false, true, false)
on conflict (path_pattern) do nothing;
```

Acceptance criteria:

- Public explorer bisa memakai rule ini untuk menyaring file.
- File internal baru tidak otomatis terekspos.

### Tabel 15 - `booking_readiness_items`

Tujuan: menyimpan readiness per booking per domain operasional, sehingga field kosong bisa dibedakan antara `missing`, `not_required`, `partner_managed`, atau `pending_ops`.

```sql
create table if not exists booking_readiness_items (
  id bigserial primary key,
  public_id text not null unique,
  booking_id bigint not null references bookings(id) on delete cascade,
  readiness_domain text not null,
  readiness_key text not null,
  readiness_state text not null default 'unknown',
  severity text not null default 'medium',
  owner_role text,
  required_by timestamptz,
  completed_at timestamptz,
  source_system text not null,
  source_record_id text,
  evidence_reference text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_readiness_items_state_check check (
    readiness_state in ('confirmed','missing','unknown','not_required','partner_managed','pending_guest','pending_ops')
  ),
  constraint booking_readiness_items_severity_check check (
    severity in ('low','medium','high','critical')
  ),
  constraint booking_readiness_items_unique_key unique (booking_id, readiness_domain, readiness_key)
);

create index if not exists idx_booking_readiness_items_booking_id on booking_readiness_items(booking_id);
create index if not exists idx_booking_readiness_items_state on booking_readiness_items(readiness_state);
create index if not exists idx_booking_readiness_items_domain on booking_readiness_items(readiness_domain, readiness_key);
create index if not exists idx_booking_readiness_items_required_by on booking_readiness_items(required_by);
```

Nilai `readiness_domain`:

- `payment`
- `pickup`
- `dropoff`
- `hotel`
- `room`
- `crew`
- `vehicle`
- `health_certificate`
- `trip_media`
- `review_request`
- `partner_document`
- `incident`

Contoh `readiness_key`:

- `payment.balance_status`
- `pickup.location`
- `pickup.time`
- `dropoff.location`
- `hotel.night_1`
- `crew.guide`
- `crew.driver`
- `vehicle.assignment`
- `health_certificate.ijen`
- `trip_media.folder_url`
- `review_request.google`

Contoh insert:

```sql
insert into booking_readiness_items (
  public_id,
  booking_id,
  readiness_domain,
  readiness_key,
  readiness_state,
  severity,
  owner_role,
  source_system,
  note
) values (
  'ready_3642_pickup_location',
  3642,
  'pickup',
  'pickup.location',
  'confirmed',
  'medium',
  'Ops Lead',
  'new_backoffice',
  'Pickup location exists in backoffice/customer portal data.'
);
```

Acceptance criteria:

- Ops dashboard bisa filter booking berdasarkan readiness gap.
- Missing field tidak disamakan dengan partner-managed atau not-required.
- Setiap readiness item punya source dan owner role.

### Nama File Migration Yang Disarankan

Jika migration dibuat sebagai SQL file, gunakan urutan nama berikut:

- `2026_08_12_000001_create_operational_events.sql`
- `2026_08_12_000002_create_booking_events.sql`
- `2026_08_12_000003_create_payment_events.sql`
- `2026_08_12_000004_create_communication_logs.sql`
- `2026_08_12_000005_create_inquiries.sql`
- `2026_08_12_000006_create_quotations.sql`
- `2026_08_12_000007_create_quotation_items.sql`
- `2026_08_12_000008_create_incident_logs.sql`
- `2026_08_12_000009_create_incident_updates.sql`
- `2026_08_12_000010_create_review_requests.sql`
- `2026_08_12_000011_create_channel_product_map.sql`
- `2026_08_12_000012_create_source_sync_runs.sql`
- `2026_08_12_000013_create_migration_diff_reports.sql`
- `2026_08_12_000014_create_data_exposure_rules.sql`
- `2026_08_12_000015_create_booking_readiness_items.sql`

### Update Schema JSON Ekosistem

Update `schemas/examples/event.template.json` menjadi:

```json
{
  "id": "evt_booking_3642_confirmed_20260902",
  "eventType": "booking.confirmed",
  "entityType": "booking",
  "entityId": "3642",
  "bookingId": "3642",
  "sourceSystem": "klook",
  "sourceRecordId": "klook-booking-uuid",
  "occurredAt": "2026-09-02T11:00:00+07:00",
  "actorType": "partner",
  "actorId": null,
  "previousState": {},
  "nextState": {
    "bookingStatus": "CONFIRMED"
  },
  "payload": {
    "channel": "KLOOK"
  },
  "sensitivity": "internal"
}
```

Tambahkan validasi minimal ke `schemas/operations.schema.json`:

- `eventIds` wajib array string jika readiness record sudah memakai event.
- readiness item harus memakai state standar.
- `sourceSystem`, `sourceCheckedAt`, dan `dataFreshness` wajib untuk file hasil sync.

### Query Validasi Database

Gunakan query ini setelah migration dibuat.

```sql
-- Event tanpa source
select count(*) as missing_source
from operational_events
where source_system is null or source_system = '';

-- Booking tanpa event import/created
select b.id
from bookings b
left join booking_events be on be.booking_id = b.id
where be.id is null
limit 50;

-- Payment event tanpa booking
select count(*) as payment_without_booking
from payment_events
where booking_id is null;

-- Review request yang received tapi belum link review
select public_id, booking_id, status
from review_requests
where status in ('received','linked') and review_id is null;

-- Channel product unknown
select *
from channel_product_map
where mapping_status = 'unknown';

-- Exposure rule untuk restricted data yang public
select *
from data_exposure_rules
where exposure_level in ('restricted','migration_only') and allowed_public = true;
```

### Cutover Gate Untuk PostgreSQL

PostgreSQL target belum boleh dianggap operational truth sampai semua poin ini terpenuhi:

- Hosting MySQL vs PostgreSQL diff report untuk booking, package, customer, payment, finance, logistics, crew, vehicle, hotel, review sudah dibuat.
- P0 mismatch sudah resolved atau accepted oleh owner.
- Scheduler target setelah cutover jelas.
- PostgreSQL access sudah restricted.
- Backup dan restore test sudah dilakukan.
- App yang membaca PostgreSQL sudah punya rollback path ke source lama atau read-only mode.
- Data exposure rules aktif untuk explorer.

## 10. Phase 3 - Hardening KLOOK Dan Partner Channel

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

## 11. Phase 4 - Profit Dan Operations Intelligence

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

## 12. Phase 5 - Review Engine Dan Crew Evidence

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

## 13. Phase 6 - Validation Dan Build Gate

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

## 14. Urutan Implementasi Yang Disarankan

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

## 15. Ready To Implement Checklist

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

## 16. Template Status Mingguan

Gunakan format ini untuk update ke owner.

```md
# JVTO Operating Ecosystem Weekly Status - YYYY-MM-DD

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

## 17. Risiko Dan Mitigasi

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

## 18. Catatan Handoff

Hal yang harus dijelaskan ke rekan kerja:

- Jangan mulai dari coding lifecycle dulu sebelum source-of-truth matrix dan migration boundary jelas.
- Jangan mengubah data operational truth tanpa konfirmasi owner.
- Jangan mengekspos folder internal ke public explorer tanpa policy.
- Jangan menyimpan secret, token, raw customer data, atau payload pembayaran ke repo.
- Jika menemukan data yang tidak cocok antara hosting, PostgreSQL, API, dan snapshot, buat entry di decision log, bukan memilih diam-diam.
