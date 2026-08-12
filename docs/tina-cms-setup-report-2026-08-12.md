# Tina CMS Setup Report

Tanggal implementasi: 2026-08-12

## Tujuan

Tina CMS dipasang sebagai editor untuk source content JVTO Operating Ecosystem. CMS diarahkan ke file sumber yang menjadi single source of truth, bukan ke file output website.

## Lokasi CMS

- Konfigurasi Tina: `tina/config.ts`
- Generated Tina client/types: `tina/__generated__/`
- Build admin lokal: `public/admin/`
- Media upload default: `public/uploads/`

## Collection yang Aktif

Tina saat ini membaca 34 dokumen sumber yang sudah disesuaikan dengan sitemap live `javavolcano-touroperator.com` pada 2026-08-12:

- 13 Travel Guide source, termasuk `/travel-guide`
- 17 Why JVTO source, termasuk 11 crew detail `/why-jvto/our-team/{code}`
- 4 Policy source, termasuk `/policy`

Folder `5-experience-engine/` tetap dianggap output hasil render dan tidak diedit langsung dari CMS.

## Field yang Bisa Diedit Saat Ini

Field yang dibuka di Tina:

- Identitas sumber: `schema_version`, `source_type`, `domain`, `slug`, `route`
- Metadata halaman: `meta.title`, `meta.browserTitle`, `meta.description`, `meta.section`, `meta.status`, `meta.owner`, `meta.lastReviewed`, `meta.schemaTypes`, `meta.faqKey`, `meta.summary`
- SEO: `seo.title`, `seo.description`, `seo.canonicalRoute`, `seo.schemaTypes`
- Body konten yang stabil: `content.payload.body_md`, `content.payload.lede`, `content.payload.intro`, `content.payload.hero`, `content.payload.quickFacts`, `content.payload.temperatureContext`, `content.payload.related`, serta scalar fields di `content.payload.sections` dan `content.payload.sections.blocks`
- FAQ: `faq.key`, `faq.payload.items`, `faq.payload.lastReviewed`, `faq.payload.owner`, `faq.payload.reviewStatus`
- Output target: `output_targets`
- Source trace: `source_trace`

Bagian nested yang sangat kompleks, terutama array campuran seperti `sections.items` dan `blocks.items`, masih dipreservasi tetapi belum dibuka penuh. Alasannya: beberapa halaman memakai array string, sementara halaman lain memakai array object dengan struktur berbeda. Tahap berikutnya adalah normalisasi template body agar item-item kompleks itu bisa diedit aman dari CMS.

## Command Operasional

Audit schema dan source:

```bash
npm run cms:audit
```

Menjalankan CMS lokal:

```bash
npm run cms:dev
```

Menjalankan CMS lokal dengan auto-render setelah source berubah:

```bash
npm run cms:dev:auto
```

Build admin Tina lokal:

```bash
npm run cms:build
```

Render ulang output website setelah source diedit:

```bash
npm run render:web-content
```

Menjalankan explorer/API project:

```bash
npm run start
```

## Alur Kerja Editing Konten

1. Editor mengubah konten lewat Tina CMS.
2. Tina menyimpan perubahan ke file `*.source.json` di folder domain.
3. Jalankan `npm run render:web-content`.
4. Renderer menghasilkan ulang file di `5-experience-engine/public-website/pages/`, `5-experience-engine/json-ld/pages/`, dan `5-experience-engine/knowledge-feed/`.
5. Website mengonsumsi endpoint route-level seperti `/api/website/page?route=/travel-guide/packing-list`.

## Validasi yang Sudah Dilakukan

- `npm run cms:audit -- --verbose` berhasil.
- Tina membaca 13 dokumen Travel Guide, 17 dokumen Why JVTO, dan 4 dokumen Policy.
- `npm run render:web-content` berhasil menghasilkan 34 website output, 34 JSON-LD output, dan 34 feed record.
- `/admin` dari server project merespons `200 text/html`.
- `/api/website/routes` mengembalikan 34 route.
- `/api/website/page?route=/travel-guide/packing-list` mengembalikan payload website dan tetap menjaga `faq: null` ketika halaman belum memiliki FAQ.
- Schema Tina yang sudah membuka body field stabil berhasil diaudit dan dibuild.
- Perbandingan route source vs sitemap live untuk Travel Guide, Policy, dan Why JVTO menghasilkan `missingInRepo: []` dan `extraInRepo: []`.

## Catatan Implementasi

- Tina versi baru memakai folder `tina/`, bukan `.tina/`.
- Script build Tina adaptif: jika `NEXT_PUBLIC_TINA_CLIENT_ID` dan `TINA_TOKEN` tersedia, build memakai TinaCloud/Git-backed mode; jika tidak, build memakai local mode.
- Nilai `null` pada source CMS dinormalisasi untuk kompatibilitas Tina. Field FAQ kosong tetap dirender sebagai `null` pada output website.
- Untuk halaman markdown, editor dapat mengubah body utama di `content.payload.body_md`.
- Untuk halaman JSON/structured, editor dapat mengubah lede, intro, hero, quick facts, related links, dan scalar section/block fields. Item kompleks perlu template normalization sebelum dibuka penuh.
- `public/admin/` adalah hasil build Tina dan diabaikan oleh `.gitignore` bawaan Tina. Di VPS, jalankan `npm run cms:build` setelah pull/install jika ingin `/admin` tersedia.
- Workflow GitHub Actions untuk deploy otomatis ada di `.github/workflows/deploy-vps.yml`. Detail secrets dan alurnya ada di `docs/cms-render-deploy-automation-2026-08-12.md`.

## Tahap Berikutnya

- Normalisasi `sections.items` dan `blocks.items` menjadi block schema yang konsisten per template halaman.
- Setelah schema item stabil, buka item-level editing penuh di Tina.
- Tambahkan workflow deploy yang menjalankan `npm install`, `npm run cms:build`, `npm run render:web-content`, lalu restart PM2.
