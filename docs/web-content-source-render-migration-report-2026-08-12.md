# Web Content Source and Render Migration Report

> Update 2026-08-12: angka pada laporan awal ini sudah disesuaikan oleh alignment live terbaru. Setelah dicocokkan dengan sitemap live `javavolcano-touroperator.com`, source website cluster sekarang berjumlah 34 route: 13 Travel Guide, 4 Policy, dan 17 Why JVTO. Lihat `docs/live-web-cluster-alignment-2026-08-12.md`.

Tanggal eksekusi: 2026-08-12

## Scope

Migrasi awal dilakukan untuk konten web public berikut:

- Travel Guide dan seluruh turunannya yang tersedia saat ini;
- Why JVTO dan seluruh turunannya;
- Policy dan seluruh turunannya.

Tujuan migrasi:

- satu file source editable per page object;
- source tetap berada di 5 folder ekosistem awal, bukan di layer keenam;
- output website, schema, dan knowledge feed digenerate dari source;
- website bisa konsumsi endpoint per route.

## Source yang dibuat

Total source setelah alignment live: 34 file.

Distribusi:

- Travel Guide: 13 source
- Why JVTO: 17 source
- Policy: 4 source

Folder source:

```text
1-knowledge-and-evidence-core/travel-guide/*.source.json
1-knowledge-and-evidence-core/why-jvto/*.source.json
1-knowledge-and-evidence-core/policies/*.source.json
```

Catatan Travel Guide:

- 23 source dibuat dari file core lama.
- 3 source dibuat dari route aktif `jvto-web` karena belum ada canonical core source sebelumnya:
  - `/travel-guide/mount-bromo-logistics`
  - `/travel-guide/tumpak-sewu-logistics`
  - `/travel-guide/packing-list`

## Output yang digenerate

Renderer menghasilkan:

- 34 website page output setelah alignment live;
- 34 JSON-LD page output setelah alignment live;
- 1 public web content knowledge feed;
- 1 route output index;
- 1 source-output map.

Folder output:

```text
5-experience-engine/public-website/pages/*.website-output.json
5-experience-engine/json-ld/pages/*.schema-output.json
5-experience-engine/knowledge-feed/public-web-content.feed-output.json
5-experience-engine/manifests/route-output-index.json
5-experience-engine/manifests/source-output-map.json
```

## Command yang ditambahkan

```bash
npm run migrate:web-content:sources
npm run render:web-content
```

Script:

```text
scripts/migrate-web-content-to-source.mjs
scripts/render-web-content-sources.mjs
```

## Endpoint yang ditambahkan

Endpoint page-level untuk website:

```text
GET /api/website/page?route=/travel-guide
GET /api/website/page?route=/travel-guide/booking-information
GET /api/website/page?route=/why-jvto
GET /api/website/page?route=/policy/booking-payment-cancellation
```

Endpoint daftar route:

```text
GET /api/website/routes
```

Endpoint membaca dari:

```text
5-experience-engine/public-website/pages/*.website-output.json
5-experience-engine/manifests/route-output-index.json
```

Bukan dari:

```text
archive/**
raw Markdown/JSON lama
```

## Validasi

Validasi lokal:

```text
sourceCount: 34
travel-guide: 13
why-jvto: 17
policy: 4
badCount: 0
missingMustRoutes: []
outputsMissing: []
```

Endpoint test:

```text
/api/website/page?route=/travel-guide/packing-list
  -> returns public_website_page payload

/api/website/routes
  -> returns 34 routes
```

## Status source vs output

Editable CMS source:

```text
*.source.json
```

Generated output:

```text
*.website-output.json
*.schema-output.json
*.feed-output.json
```

Read-only snapshot:

```text
archive/**
```

## Catatan transisi

File lama belum dihapus.

Alasannya:

- menjaga rollback;
- menjaga audit trail;
- menghindari breaking change mendadak;
- memberi waktu untuk memastikan Tina CMS dan `jvto-web` sudah membaca source/output baru.

Langkah berikutnya:

1. Pasang Tina CMS hanya ke `*.source.json`.
2. Update `jvto-web` agar membaca `/api/website/page?route=...` untuk cluster ini.
3. Setelah website stabil, tandai file lama sebagai legacy/internal atau pindahkan ke archive.
4. Tambahkan drift check agar source berubah tetapi output belum dirender bisa terdeteksi.
