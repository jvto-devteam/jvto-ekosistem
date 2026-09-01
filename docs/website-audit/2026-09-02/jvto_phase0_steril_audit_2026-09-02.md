# JVTO Phase 0 — Steril Audit: Snapshot Diff & Status 6 Handoff Issue

Protokol: analisis-steril. Dijalankan: 2026-09-02, sesi tunggal, tanpa mutasi file di kedua repo.

## 1. SCOPE

```
OBJEK      : repo lokal jvto-web@485b2f85 (branch live) + jvto-ekosistem@ac722c4c (branch main),
             dibandingkan terhadap audit_scope.zip (snapshot 2026-08-29/30) yang ada di
             jvto-ekosistem/docs/website-audit/2026-08-29/audit_scope.zip
PERTANYAAN : Sejak snapshot audit, apa yang berubah di kode, dan dari 6 handoff issue yang
             tercatat (pattern /tours/from-surabaya, /tours/from-bali, /why-jvto, /travel-guide,
             /policy, /destinations), mana yang sudah beres di kode+produksi saat ini vs masih terbuka?
BATAS      : tidak mengubah file/kode/commit di kedua repo; tidak menjalankan script yang menulis
             output (render/validate); live-crawl dibatasi ke 8 URL yang terikat langsung ke 6
             issue tersebut (bukan re-audit penuh 296 URL populasi)
KEDALAMAN  : git log/diff + baca source code penuh untuk file yang relevan ke 6 issue + live
             HTTP fetch (raw, tanpa dedup) untuk 8 URL representative
OUTPUT     : dokumen ini (markdown) + CSV pendamping (jvto_phase0_findings_2026-09-02.csv)
SELESAI    : setiap dari 6 issue punya status berbasis bukti (bukan tebakan), setiap temuan lolos
             gerbang falsifikasi, ID stabil dipetakan lintas sumber
```

Konkurensi: HEAD kedua repo di-pin dua kali (awal dan sebelum mulai mengukur) — tidak berubah. Working tree kedua repo punya perubahan belum di-commit yang tidak disentuh dan tidak relevan ke scope ini (lihat PARKIR).

## 2. METODE

Semua angka di bawah bisa direproduksi dengan perintah berikut (dijalankan dari root masing-masing repo).

**Diff snapshot → HEAD:**
```bash
# jvto-web
git rev-list --count e06b35951c612be5356b23f42965e233abe5cf34..HEAD
git log --oneline e06b35951c612be5356b23f42965e233abe5cf34..HEAD
git diff --stat e06b35951c612be5356b23f42965e233abe5cf34..HEAD

# jvto-ekosistem
git rev-list --count 928e684abab268345a5bae5d6a803af22c2a7d7e..HEAD
git log --oneline 928e684abab268345a5bae5d6a803af22c2a7d7e..HEAD
git diff --stat 928e684abab268345a5bae5d6a803af22c2a7d7e..HEAD
```

**Validitas SHA yang diklaim playbook:**
```bash
git merge-base --is-ancestor <SHA> HEAD && echo ancestor || echo not-ancestor
```

**Integritas populasi 296 URL** (ekstrak `audit_scope.zip`, lalu):
```python
import csv
rows_inv = list(csv.reader(open('url_inventory.csv', newline='', encoding='utf-8')))
rows_audit = list(csv.reader(open('live_html_url_audit.csv', newline='', encoding='utf-8')))
# bandingkan len(), set(url kolom 0), duplikat via collections.Counter
```
Catatan: `wc -l live_html_url_audit.csv` melaporkan 375 baris — ini SALAH sebagai hitungan baris logis (ada newline di dalam field ber-quote, mis. meta description panjang). Hitungan baris logis yang benar via csv parser: 296 data rows, sama persis dengan `url_inventory.csv`. Sempat jadi hipotesis "populasi audit tidak lengkap" — gugur setelah diverifikasi dengan parser yang benar.

**Live re-crawl (raw, tanpa dedup @type):**
Script Python memakai `urllib` standar, regex untuk title/meta/canonical/H1/OG/Twitter, dan `json.loads` per blok `<script type="application/ld+json">`, lalu menghitung `@type` di setiap node teratas `@graph` TANPA dedup (`collections.Counter`, bukan `set`). Ini sengaja beda dari tool audit yang sudah ada.

**Temuan metodologi penting:** `jvto-ekosistem/scripts/live-html-audit.mjs` baris 131 menghitung `json_ld_types` dengan `new Set(...)` — di-dedup sebelum disimpan ke CSV. Artinya kolom `json_ld_types` di `live_html_url_audit.csv` (baseline yang ada) **tidak bisa** dipakai untuk mendeteksi node schema duplikat (persis defect yang issue-001/003/006 pertanyakan). "WebPage" muncul sama di CSV baik kalau nodenya 1 maupun 2. Baseline itu valid untuk field lain (title/meta/canonical/OG/H1), tapi tidak valid sebagai bukti singleton-schema. Live re-crawl saya di atas menghitung raw count justru untuk menutup celah ini.

**Sumber domain produksi:** `https://javavolcano-touroperator.com`, diambil dari `audit_scope.md` di dalam `audit_scope.zip` (bukan tebakan, bukan dari config repo).

## 3. HASIL

### 3.1 Integritas populasi audit

| Metrik | Nilai | Sumber |
|---|---|---|
| URL di `url_inventory.csv` | 296 | `[terukur]` csv parser |
| URL di `live_html_url_audit.csv` | 296 | `[terukur]` csv parser |
| URL hilang dari audit vs inventory | 0 | `[terukur]` |
| URL ekstra di audit vs inventory | 0 | `[terukur]` |
| URL duplikat di audit | 0 | `[terukur]` |

### 3.2 Delta commit sejak snapshot audit

| Repo | Snapshot audit | Klaim "current" playbook §0 | HEAD aktual sekarang | Snapshot→klaim-playbook | Klaim-playbook→HEAD | Snapshot→HEAD |
|---|---|---|---|---|---|---|
| jvto-web (live) | `e06b3595` (2026-08-29) | `62989ceb` | `485b2f85` (2026-09-02 01:12 +07) | 16 commit | 8 commit | **24 commit** |
| jvto-ekosistem (main) | `928e684a` (2026-08-29) | `2bc370e1` | `ac722c4c` (2026-09-01 06:10 UTC) | 21 commit | 4 commit | **25 commit** |

`[terukur]`. Kedua SHA yang diklaim playbook terverifikasi sebagai ancestor asli dari HEAD (bukan salah ketik) — playbook-nya sendiri sudah basi 8 commit (web) dan 4 commit (ekosistem) sejak ditulis, di atas ketertinggalannya sendiri terhadap `audit_scope.zip`.

### 3.3 Status 6 handoff issue (ID kanonik = pattern URL, lihat §3.4 untuk pemetaan nomor)

| ID Kanonik | Pattern | Status | Ringkasan bukti |
|---|---|---|---|
| P1-SURABAYA-SCHEMA | `/tours/from-surabaya/{slug}` | **RESOLVED** | Kode: ekosistem hanya kirim TouristTrip+AggregateOffer, web bangun WebPage+Product sendiri — split bersih. Live (`bromo-1d1n`): WebPage=1, BreadcrumbList=1, Product=1 (semua singleton). TouristTrip=2 itu by-design (node utama + per-hari), bukan defect. |
| P2-BALI-RATING | `/tours/from-bali/{slug}` | **RESOLVED** | Kode: logic ekstraksi `tourAggregateRating` dari node TouristTrip, identik dengan Surabaya (mirrored persis sesuai acceptance handoff-002), tidak ada fallback ke rating Organization. Live (`bromo-ijen-3d2n`): Product=1, WebPage=1 (singleton, konsisten). |
| P3-WHYJVTO-METADATA | `/why-jvto/{slug}` | **OPEN** (lihat catatan live) | Kode: `generateMetadata()` di file ini bikin title/description/canonical manual, tidak pernah panggil `buildStaticRouteMetadata`/`buildEcosystemRouteMetadata`/`resolveOgImage` — tidak ada owner/kontrak eksplisit, persis "unknown owner" di register. Live (`the-jvto-difference`) JUSTRU menunjukkan og:image ADA (`the-jvto-difference.webp`) — kontradiksi dengan pembacaan kode. Lihat §3.5. |
| P4-TRAVELGUIDE-METADATA | `/travel-guide/{slug}` | **PARTIALLY RESOLVED** | Kode: hub dan detail sekarang SAMA-SAMA panggil `buildEcosystemRouteMetadata()` (perbaikan nyata sejak snapshot) — tapi hub masih override title/description/openGraph dengan string hardcoded sendiri sesudahnya, detail langsung pakai output builder apa adanya. Belum benar-benar "satu kontrak seragam". Live: kedua varian (`/travel-guide`, `/travel-guide/faq`) title/desc/canonical/og:image/H1 lengkap, WebPage-family singleton. |
| P5-POLICY-CANONICAL | `/policy/{slug}` | **OPEN** | Kode: `staticRouteCanonical()` = `${PRODUCTION_ORIGIN}${route}` — selalu disintesis dari path request, tidak pernah baca field `seo.canonicalRoute` eksplisit (field itu memang tidak ada di source contract policy). Nilai canonical saat ini kebetulan benar, tapi mekanismenya tetap fallback-only persis seperti tercatat di register. |
| P6-DESTINATION-JSONLD | `/destinations/{slug}` | **LARGELY RESOLVED** (2 sampel dari 5) | Live (`mount-bromo`): JSON-LD 1 script, 10 node/tipe, TouristAttraction+Report+SpecialAnnouncement ada, WebPage/BreadcrumbList singleton. Sesuai acceptance handoff-006. |

### 3.4 Tabel pemetaan ID — TEMUAN #ID-MISMATCH

`conflict_register.csv` dan `handoff_register.csv` (dua-duanya sumber ASLI di dalam `audit_scope.zip`, bukan cuma rangkuman playbook) memakai nomor yang **tertukar** untuk dua pattern yang sama:

| Pattern | `conflict_register.csv` | `handoff_register.csv` |
|---|---|---|
| `/tours/from-surabaya/{slug}` | issue-001 | handoff-001 |
| `/tours/from-bali/{slug}` | **issue-003** | **handoff-002** |
| `/why-jvto/{slug}` | **issue-002** | **handoff-003** |
| `/travel-guide/{slug}` | issue-004 | handoff-004 |
| `/policy/{slug}` | issue-005 | handoff-005 |
| `/destinations/{slug}` | issue-006 | handoff-006 |

Playbook §3 mengikuti penomoran `conflict_register.csv`; playbook §6 (Phase 6) mengikuti penomoran `handoff_register.csv` — masing-masing konsisten dengan sumbernya sendiri, tapi kalau dibaca silang ("issue-002" vs "Handoff 002") akan merujuk ke dua masalah berbeda. Karena itu tabel §3.3 di atas pakai ID berbasis pattern URL, bukan nomor dari salah satu sumber.

## 4. TEMUAN

Setiap temuan di bawah sudah lolos percobaan falsifikasi (dicoba dibuktikan salah, gagal dipatahkan, kecuali disebutkan lain).

**F1 — P5-POLICY-WEBPAGE-DUP — DIREVISI 2026-09-02: BUKAN DEFECT (lihat CHANGELOG §7 untuk nilai lama).**
`/policy/booking-payment-cancellation` menerbitkan 2 node `WebPage` untuk URL yang sama: `#webpage` (halaman utama) dan `#policy-anchor` (`mentions` ke 2 entity glossary). `[terukur]` dari live HTML, raw count — angka ini tidak berubah. Yang berubah adalah statusnya: `[terbaca]` `jvto-web/src/lib/schemas/buildPolicySchemas.ts`, fungsi `buildPolicyWebPageSchema()`, dengan tegas menerbitkan `#policy-anchor` sebagai node WebPage kedua dengan `@id` berbeda JUSTRU untuk menghindari collision `@id` dengan node `#webpage` milik `PageJsonLdCombined` — didokumentasikan dalam komentar kode bertanggal 2026-04-29 ("AEO/GEO port Phase 4.7"), merujuk "cluster_role_contracts.md Cluster 6", pola yang sama dengan dual-source FAQPage di homepage. Ini adalah keputusan arsitektur tertulis, bukan bug. Sesuai §2 protokol ("sesuatu yang punya keputusan tertulis TIDAK BOLEH dilaporkan sebagai cacat"), status direvisi menjadi **NOT A DEFECT** dan dikeluarkan dari batch eksekusi. Pelajaran metodologi: seharusnya `buildPolicySchemas.ts` dibaca SEBELUM F1 dipublikasikan (urutan baca protokol §2 — authority sebelum pengukuran), bukan sesudahnya.

**F2 — R1-RENDER-OUTPUT: resolved dan bertahan.**
Commit `2bc370e1` ("revert: restore the tree to fceb97d2, before the render-script rewrite") adalah ancestor HEAD saat ini. `route-output-index.json` saat ini memuat semua family yang playbook syaratkan (`travel-guide`, `policy`, `why-jvto`, `verify-jvto`, `destinations`, `tours`, `blog`) — dicek dengan parse JSON langsung, bukan cuma grep nama file. Diff file itu sejak snapshot HANYA timestamp `generated_at` + 4 route review baru (327-330, sinkron rutin) — tidak ada family yang hilang. `deploy-vps.yml` sesudahnya juga diperkuat (commit terkait `fceb97d2`/`3dc84afc`) untuk memasukkan route `destinations/*` hand-authored (yang memang sengaja tidak lewat render pipeline) ke payload revalidasi webhook — perbaikan terpisah, bukan regresi.

**F3 — META-ID-MISMATCH.** Lihat §3.4 di atas — dikonfirmasi di file sumber asli, bukan cuma rangkuman playbook.

**F4 — Baseline audit tool tidak bisa mendeteksi kelas defect yang jadi alasan Phase 4 dibuat.** Lihat METODE §2 di atas — `json_ld_types` di `live_html_url_audit.csv` di-dedup dengan `Set`, jadi tidak bisa membedakan 1 node vs N node bertipe sama. F1 di atas hanya ketemu karena saya menghitung raw (bukan pakai baseline yang ada).

**F5 — P3-WHYJVTO: kontradiksi kode vs live, kemungkinan cache ISR basi.** `[terbaca]` kode: tidak ada jalur kode yang menghasilkan og:image untuk route ini. `[terukur]` live: og:image ADA dan file asetnya (`the-jvto-difference.webp`) memang ada di `public/assets/img/og/`. Header response: `x-nextjs-cache: STALE`, `cache-control: s-maxage=60, stale-while-revalidate=31535940` (~365 hari). `[dugaan, BELUM DIVERIFIKASI]`: halaman ini masih menyajikan HTML hasil render dari versi kode LAMA (sebelum refactor og-image ke `resolveOgImage`), dan belum ter-revalidate — begitu revalidate berikutnya terjadi (deploy ekosistem berikutnya, atau time-based), og:image untuk `/why-jvto/{slug}` bisa hilang tanpa ada satupun commit baru yang menyebabkannya. Ini tidak bisa saya buktikan tanpa memicu revalidate produksi, yang di luar batas non-mutasi tugas ini.

## 5. PARKIR

- `verify-jvto` pages: commit `485b2f85` (HEAD) mengubah tahun pendirian PT dari 2016 ke 2023, dan commit `65126bb1` mengubah tahun founding badge ke 2015 — tiga tahun berbeda (2016/2015/2023) muncul di riwayat commit yang sama minggu ini. `jvto-ekosistem/CLAUDE.md` sendiri menyebut "2016 PT incorporation year" sebagai nilai yang **frozen by owner decision** untuk keperluan sync lain. Di luar scope 6 issue — tidak diselidiki lebih jauh.
- `docs/audit/2026-07-14-recon-findings.md`, `docs/audit/baseline-2026-08-30/*`, dan commit `8f8f347f`/`807de826` (CLAUDE.md dedup) — housekeeping dokumentasi, di luar scope.
- Diff besar di `4-operations-core/**` dan `archive/booking-overview-snapshot/**` (booking-sync rutin) dan ~200 file `*.schema-output.json` dengan diff 4 baris — dikonfirmasi hanya `generated_at` timestamp (lihat METODE), bukan perubahan konten. Sesuai dokumentasi `jvto-ekosistem/CLAUDE.md` sendiri.
- P6-IJEN-WEBPAGE-XREF: `/destinations/ijen-crater` juga punya 2 node WebPage, tapi node keduanya (`#related-travel-guide`) merujuk ke URL LAIN (`/travel-guide/ijen-health-screening`), bukan URL halaman ini sendiri — beda kasus dari F1 (policy). Tidak melanggar aturan "satu WebPage per halaman ini" secara literal, tapi gaya penulisannya tidak konsisten dengan `mount-bromo` (yang tidak punya node semacam ini). Dicatat, tidak diselidiki lebih jauh karena bukan pelanggaran yang sama persis dengan F1.
- `package.json` "Repair corrupted package.json" (commit `c30e295c`) dan histori "test:* script chains" — housekeeping repo audit, di luar scope pertanyaan ini.

## 6. TIDAK DIKETAHUI

- Apakah commit deploy production benar-benar `485b2f85`/`ac722c4c`, atau production sedikit tertinggal — saya tidak menemukan endpoint versi/build-id untuk memverifikasi ini secara langsung. Hipotesis F5 bergantung padanya.
- Nilai numerik `aggregateRating.ratingValue` pada node Product Bali vs Organization — saya verifikasi STRUKTURnya (tidak ada node Product ganda, logic kode identik dengan Surabaya) tapi tidak menarik ulang angka rating aktual dari live HTML untuk membandingkan literal. Butuh satu fetch tambahan kalau Sam mau kepastian angka, bukan cuma struktur.
- P6 hanya disampel 2 dari 5 destinasi (`mount-bromo`, `ijen-crater`). Pola `#related-travel-guide` mungkin spesifik Ijen (satu-satunya destinasi dengan health-screening cross-link) atau mungkin juga muncul di destinasi lain — tidak dicek untuk `tumpak-sewu`, `madakaripura`, `papuma`.
- P3 (why-jvto) hanya disampel 1 dari 17 slug (`the-jvto-difference`). Baseline group_summary bilang 6 dari 17 halaman why-jvto missing og:image saat snapshot — tidak dicek apakah 6 itu masih sama sekarang atau sudah bergeser.
- Populasi lengkap 296 URL tidak di-recrawl live hari ini (by design, sesuai scope yang dipersempit) — status R5 (22 og:image) dan R6 (14 meta description) di luar 296 populasi TIDAK diverifikasi ulang di sini, hanya disinggung sebagai konteks commit `f528472b` yang mengklaim memperbaikinya.

## 7. CHANGELOG

Versi pertama (2026-09-02, sesi analisis) — tidak ada revisi. Revisi di bawah ini dibuat pada sesi lanjutan yang sama tanggal, setelah user menyetujui eksekusi mutasi terbatas.

### Revisi 1 — F1 / P5-POLICY-WEBPAGE-DUP: OPEN → NOT A DEFECT

- **Nilai lama**: "OPEN - NEW FINDING", akar masalah `[dugaan] BELUM DIVERIFIKASI`, minimum_action "merge #policy-anchor's mentions into the #webpage node, or retype it away from WebPage".
- **Nilai baru**: "NOT A DEFECT — matches documented decision", minimum_action: none (tidak ada aksi).
- **Bukti yang mengubah**: `[terbaca]` `jvto-web/src/lib/schemas/buildPolicySchemas.ts` (fungsi `buildPolicyWebPageSchema()`), komentar kode bertanggal 2026-04-29 yang secara eksplisit mendokumentasikan `#policy-anchor` sebagai node WebPage kedua yang disengaja untuk menghindari `@id` collision, merujuk "cluster_role_contracts.md Cluster 6". Dibaca saat menyiapkan eksekusi mutasi untuk item ini — belum dibaca saat F1 pertama kali ditulis.
- **Dampak turunan**: tidak ada angka lain di §3.1/§3.2/§3.3 yang berubah. Item ini DIKELUARKAN dari batch eksekusi yang disetujui user — tidak ada kode yang diubah untuknya.

### Revisi 2 — P4-TRAVELGUIDE-METADATA: minimum_action direvisi (status §3.3 tidak berubah)

- **Nilai lama minimum_action**: "remove hub's post-builder override so both variants share one code path".
- **Nilai baru**: override hub TIDAK BISA dihapus apa adanya — ia menyertakan blok `twitter` card (`summary_large_image`, title/description/images) yang tidak disediakan `buildEcosystemRouteMetadata()`. Menghapus override berarti menghilangkan Twitter card yang saat ini berfungsi di `/travel-guide` (regresi, bukan perbaikan). Perbaikan yang benar butuh salah satu: (a) tambahkan dukungan `twitter` card ke `buildEcosystemRouteMetadata()` lalu baru hapus override hub (scope lebih besar, di luar batch ini), atau (b) terima override hub sebagai pengayaan yang disengaja dan tutup P4 sebagai "partially resolved by design".
- **Bukti yang mengubah**: `[terbaca]` `jvto-web/src/app/(website)/travel-guide/page.tsx` baris ~391-423 dibandingkan `EcosystemTravelGuidePage.tsx` dan `buildEcosystemRouteMetadata()` (`src/lib/ecosystemContent/website.ts`), dibaca saat menyiapkan eksekusi.
- **Dampak turunan**: status "PARTIALLY RESOLVED" di §3.3 tidak berubah. Item ini DIKELUARKAN dari batch eksekusi — perlu keputusan Sam (opsi a/b di atas) sebelum dieksekusi di batch berikutnya.

### Mutasi yang dieksekusi 2026-09-02 (instruksi eksplisit user, terpisah dari analisis di atas, sesuai §10 protokol)

| # | Repo | Branch baru | Commit | File | Aksi | Cara undo |
|---|---|---|---|---|---|---|
| 1 | jvto-web | `fix/phase0-p3-whyjvto-metadata-owner` | `5e06506c` | `src/app/(website)/why-jvto/[slug]/page.tsx` | P3-WHYJVTO-METADATA: ganti metadata manual → `buildStaticRouteMetadata()`. Diverifikasi `tsc --noEmit` bersih (0 error), diff aditif saja (canonical/hreflang tidak berubah). | `git revert 5e06506c` di branch tsb, atau hapus branch — belum di-push, belum di-merge ke `live`. |
| 2 | jvto-ekosistem | `fix/phase0-audit-id-mapping` | `3decfb65` | `docs/website-audit/2026-08-29/conflict_register.csv`, `handoff_register.csv` | META-ID-MISMATCH: tambah kolom `cross_ref_id` ke kedua register (pemetaan silang, tidak menomori ulang ID manapun). | `git revert 3decfb65` di branch tsb, atau hapus branch — belum di-push, belum di-merge ke `main`. |

Item yang disetujui user tapi TIDAK dieksekusi karena Revisi 1 & 2 di atas: **P5-POLICY-WEBPAGE-DUP** (bukan defect), **P4-TRAVELGUIDE-METADATA** (fix sederhana meregresi Twitter card). **P5-POLICY-CANONICAL** juga tidak dieksekusi — ditunda sesuai keputusan eksplisit user sebelum eksekusi dimulai, tidak terkait Revisi 1/2.

Kedua branch di atas ada lokal di masing-masing repo di komputer Sam, belum di-push ke GitHub (shell eksekusi tidak punya kredensial push) dan belum di-merge — perlu push + review + merge oleh Sam sendiri.

**Insiden operasional (tidak mengubah temuan manapun, dicatat untuk transparansi):** saat membuat commit mutasi #2 di atas, `git commit` sempat tanpa sengaja menyertakan `docs/website-audit/2026-08-29/audit_scope.zip` yang sudah staged sebelumnya oleh proses lain (bukan bagian dari mutasi yang disetujui, dan bukan file yang saya sentuh). Diperbaiki dengan `git reset --soft HEAD^` lalu commit ulang memakai pathspec eksplisit untuk 2 file CSV saja. Kondisi akhir: `audit_scope.zip` kembali berstatus staged-tapi-belum-commit persis seperti saat pertama kali ditemukan — tidak di-commit, tidak di-unstage oleh saya.
