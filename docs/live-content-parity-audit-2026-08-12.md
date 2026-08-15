# Live Content Parity Audit

Tanggal pemeriksaan: 2026-08-12

## Scope

Audit ini memeriksa parity antara live website `javavolcano-touroperator.com` dan source/output `jvto-ekosistem` untuk:

- `/travel-guide`
- `/policy`
- `/why-jvto`
- semua route turunan di tiga cluster tersebut

## Sumber Pemeriksaan

- Live sitemap: `https://javavolcano-touroperator.com/sitemap.xml`
- Live HTML untuk 34 route
- Source live-code lokal `jvto-web`
- Source/output lokal `jvto-ekosistem`

Temporary crawl output disimpan selama audit di `tmp-live-audit/`
(`routes.json`, `live-pages.json`, `comparison-report.json`, dan 34 berkas HTML).

**Dihapus 2026-08-15.** Isinya adalah scrape situs live — yang dirender oleh `jvto-web`
dari Postgres, **bukan** oleh renderer repo ini. Karena `tmp-live-audit/pages/policy.html`
berdampingan dengan `5-experience-engine/public-website/pages/policy.website-output.json`,
penamaan rute yang nyaris sama di dua pohon berbeda membuat scrape itu terbaca sebagai
keluaran renderer, dan menghasilkan kesimpulan yang salah tentang isi halaman. Angka-angka
di dokumen ini tetap berlaku sebagai catatan per 2026-08-12.

Untuk mengulang audit, crawl ulang ke direktori di luar repo. Jangan simpan scrape situs
live di dalam pohon yang juga memuat keluaran renderer.

## Route Parity

Hasil:

```json
{
  "liveCount": 34,
  "repoCount": 34,
  "missingInRepo": [],
  "extraInRepo": []
}
```

Kesimpulan: route parity 100%.

## Metadata Parity

Yang dicek:

- live `<title>`
- live meta `description`
- source `seo.title`
- source `seo.description`

Hasil setelah perbaikan:

```json
{
  "metadataMismatchCount": 0,
  "mismatches": []
}
```

Kesimpulan: metadata parity 100% untuk 34 route.

## Perbaikan yang Dilakukan

Sebelum perbaikan ada mismatch di:

- `/travel-guide/mount-bromo-logistics`
- `/travel-guide/packing-list`
- `/travel-guide/tumpak-sewu-logistics`

Ketiganya sudah disesuaikan dengan live HTML title/description.

Temuan tambahan:

- Live `/travel-guide/packing-list` saat ini merender konten yang sama dengan `/travel-guide/packing-and-fitness`.
- Source `/travel-guide/packing-list` sebelumnya berisi konten khusus "Packing List for East Java", sehingga tidak sama dengan live.
- Source `/travel-guide/packing-list` sudah dimirror ke konten Packing & Fitness agar sesuai live, dengan route/canonical tetap `/travel-guide/packing-list`.

## Source/Output Parity

Hasil setelah render ulang:

```json
{
  "sourceCount": 34,
  "websiteOutputCount": 34,
  "schemaOutputCount": 34,
  "feedRecordCount": 34
}
```

Manifest/feed:

```json
{
  "routeIndex": 34,
  "feedRecords": 34,
  "hasPackingList": true,
  "hasPackingFitness": true
}
```

## Duplicate File Check

Exact duplicate aktif untuk area source/output non-archive:

- Tidak ditemukan.

Catatan:

- `/travel-guide/packing-list` dan `/travel-guide/packing-and-fitness` sekarang memiliki konten yang secara konsep sama karena live website juga begitu.
- File tidak exact duplicate karena route/canonical/source trace berbeda.

## Validasi Command

Berhasil:

```bash
npm run render:web-content
npm run cms:audit -- --verbose
node --check server.mjs
node --check scripts/render-web-content-sources.mjs
node --check scripts/build-tina-admin.mjs
```

GitHub Actions YAML juga berhasil diparse.

## Kesimpulan

Yang dapat diverifikasi 100% dari live:

- daftar route;
- HTTP status route;
- `<title>`;
- meta description;
- source/output count;
- manifest/feed route count.

Untuk body content, parity dilakukan dengan:

- live HTML crawl;
- live-code source inspection;
- perbaikan mismatch nyata pada `/travel-guide/packing-list`.

Setelah perbaikan, tidak ada mismatch metadata/route/output yang tersisa. Body content yang bisa dipastikan berbeda dari live sudah diperbaiki.
