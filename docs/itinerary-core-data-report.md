# Itinerary Core Data Report

Pemeriksaan dilakukan pada `/Users/macbook/Code/jvto-itinerary-core`.

## Ringkasan

`jvto-itinerary-core` berisi data yang dapat dipakai untuk melengkapi JVTO Operating Ecosystem. Bagian paling relevan adalah dataset terkompilasi di `generated/itinerary-intelligence/`, karena berisi konteks rute, pickup/dropoff, waktu, hotel, aktivitas, kendaraan, crew, rekomendasi operasional, komponen biaya, dan output map/template.

Snapshot lengkap disimpan di:

- `/Users/macbook/Code/jvto-ekosistem/archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/`
- `/Users/macbook/Code/jvto-ekosistem/archive/itinerary-intelligence-snapshot/exports/`

## Data Yang Dimasukkan Ke Folder Aktif

### 1. Knowledge And Evidence Core

- `destination-knowledge/destination-activity-profiles.json`
- `destination-knowledge/destinations-master.json`
- `stable-operational-guidance/timezone-rules.json`
- `stable-operational-guidance/guest-meeting-protocol.json`

### 2. Product And Commercial Core

- `tour-products/package-catalog-index.json`
- `routes-and-itineraries/standard-package-route-map.json`
- `routes-and-itineraries/route-leg-index.json`
- `routes-and-itineraries/route-node-index.json`
- `routes-and-itineraries/location-alias-registry.json`
- `routes-and-itineraries/tomtom-geotag-index.json`
- `pricing-rules/cost-components.json`
- `pricing-rules/package-pricing-matrix.json`
- `add-ons/bali-transport-addons.json`
- `add-ons/other-catalog-items.json`

### 3. Booking And Journey Core

- `pickup-and-dropoff/pickup-contexts.json`
- `pickup-and-dropoff/dropoff-contexts.json`
- `pickup-and-dropoff/time-window-rules.json`

### 4. Operations Core

- `operational-events/operational-events.json`
- `operational-events/activities-master.json`
- `operational-events/meal-logic.json`
- `operational-events/meal-stops.json`
- `hotel-and-partner-confirmation/accommodation-logic.json`
- `hotel-and-partner-confirmation/hotels-master.json`
- `vehicle-assignment/transport-master.json`
- `crew-assignment/transport-crew-rules.json`
- `trip-readiness/recommendation-rules.json`
- `trip-readiness/operational-context-index.json`
- `trip-readiness/staging-area-contexts.json`
- `closure-and-plan-b/road-situation-profiles.json`

### 5. Experience Engine

- `public-website/visual-map-layer.json`
- `public-website/output-template-map.json`

## Data Yang Tidak Dimasukkan Ke Folder Aktif

- `21-package-expense-map.json`: ditahan karena masuk area expense/internal cost calibration, sesuai keputusan sebelumnya bahwa internal expense dikerjakan nanti.
- `agent-contract/` (10 file): sengaja tetap di arsip saja. Lihat bagian **Agent Contract** di bawah.
- `exports/*/sample-*.json`: disimpan di arsip saja karena masih berupa sample output, bukan data operasional final.
- `schema-inventory.json`, `source-inventory.json`, `extraction-manifest.json`, dan file report/gap teknis: disimpan di arsip karena lebih berfungsi sebagai metadata/pemeriksaan, bukan konten domain utama.

## Agent Contract

`generated/itinerary-intelligence/agent-contract/` di jvto-itinerary-core berisi 10 file
berskema `agent-contract-v1`: README, `manifest.json`, dan 8 dataset yang diindeks
manifest. Ini **proyeksi agent-safe** — subset
minimal yang dibutuhkan runtime untuk routing dan guardrail, sudah dibersihkan dari
seluruh field biaya, rate vendor, margin, identitas crew, dan PII.

| File | Menjawab |
|---|---|
| `manifest.json` | Indeks + guarantees. Entry point; jangan hardcode daftar file. |
| `standard-route-truth.json` | Route truth kanonik 16 paket, tiap field diklasifikasi kekuatan buktinya. |
| `package-operational-composition.json` | Leg/destinasi/staging/endpoint penyusun tiap paket. |
| `package-customization-boundaries.json` | Standard vs handoff; kelayakan instant-book. |
| `route-validation-rules.json` | Kapan runtime tidak boleh menjawab "bisa" tanpa cek kelayakan. |
| `pickup-dropoff-requirements.json` | Pertanyaan minimum yang wajib ditanyakan per titik jemput/antar. |
| `destination-operational-overlays.json` | Data destinasi menjadi pemicu operasional. |
| `staging-logic.json` | Alasan menginap dekat Bromo/Ijen/Tumpak Sewu (tanpa tarif). |
| `operational-readiness.json` | Status tiap dataset, agar data seed/inferred tidak diperlakukan sebagai final. |

### Kepemilikan dan konsumen

- **Owner: `jvto-itinerary-core`.** Dihasilkan `scripts/build-agent-contract.mjs`;
  README-nya menyatakan *read-only, jangan diedit tangan, regenerate dari sumber*.
- **Konsumen: `jvto-whatsapp-agent-runtime`.** Runtime menyematkannya lewat
  `config/upstreams.yaml` → `itinerary_core.agent_contract_root`, di-pin ke release
  itinerary-core, lalu di-*vendor* ke agent-catalog rilisnya sendiri.
  `config/data-ownership.yaml` menetapkan itinerary-core sebagai owner
  `operational_feasibility`.

**Runtime tidak membaca dari repo ini.** Karena itu agent-contract sengaja tidak
dipromosikan ke folder aktif: menyalinnya ke sini hanya menghasilkan duplikat tanpa
pembaca, sekaligus menjadikan ekosistem sumber kebenaran ketiga untuk data yang
generatornya tidak ada di sini.

### Salinan di repo ini

Mirror read-only, byte-identical saat diaudit 2026-08-28:

```
archive/itinerary-intelligence-snapshot/generated/itinerary-intelligence/agent-contract/
```

Snapshot titik-waktu, bukan sumber kebenaran. Untuk data terkini baca release
jvto-itinerary-core. Jika mirror ini perlu di-refresh, salin ulang dari sana —
jangan mengedit isinya di tempat.

Catatan: README di arsip mendahului koreksi 2026-08-28 di repo asal (dua nama flag
yang tidak pernah ada di generator, dan bagian "Known gap" yang bertentangan dengan
datanya sendiri). File JSON-nya tidak terpengaruh.

## Catatan Kebersihan Data

- Tidak ada customer PII baru yang dimasukkan dari itinerary-core ke folder aktif.
- Jejak teknis berupa alamat koneksi database internal dibersihkan dari salinan proyek ekosistem karena bukan bagian dari data domain.
- Nomor telepon hotel/partner masih ada di `hotels-master.json` karena termasuk data partner operasional, bukan data tamu.

