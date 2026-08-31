# JVTO — LAPORAN KONSOLIDASI & EKSEKUSI
### Hasil update / combine / delete atas seluruh data audit, dokumen, dan kode
**2026-08-30** · `jvto-web@live 99673b2f` · `jvto-ekosistem@main fceb97d2` · produksi 296 URL

---

## 1 — PETA KONSOLIDASI AKHIR

### 1.1 Enam lapisan, sesudah pembersihan

```
┌─ GOVERNANCE / CONTROL PLANE ────────────────────────────────┐
│ state/goals.json  ← 9 decisions · 3 backlog · policies      │
│                     baseline (2026-08-27)                   │
│ rendered-graph-contract.json → governance.decisionsHonored  │
│ fact-review-and-ownership/ · docs/ (29 dok)                 │
│ [DELETE] "4-channel-outputs + 4 file registry" (mitos dok)  │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌─ CANONICAL SOURCE ──────────────────────────────────────────┐
│ 1-knowledge-and-evidence-core  (20 domain)                  │
│ 2-product-and-commercial-core  (17 product-contract)        │
│ 3-booking-and-journey-core                                  │
│ 4-operations-core              (9 domain)                   │
│ tulis: manusia · TinaCMS · sync(booking/reviews/llm-wiki)   │
│ [DELETE] 2 snapshot terbalik dari jvto-web → archive/       │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌─ COMPILER ──────────────────────────────────────────────────┐
│ render-web-content-sources · generate-review-schema         │
│ generate-tourist-trip-schema · run-generators(10)           │
│ render-llms-txt · build-{organization,person,tourist-trip}  │
│ [DELETE] 3 npm script registry mati                          │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌─ COMPILED OUTPUT ───────────────────────────────────────────┐
│ json-ld/pages/            290 schema-output.json            │
│ public-website/pages/      51 website-output.json           │
│ manifests/route-output-index.json   290 route               │
│ manifests/source-output-map.json     51 mapping             │
│ manifests/rendered-graph-contract.json  ★ BARU              │
│   22 routeGroup · 296 route · 14 baselineViolations         │
└──────────────────────────┬───────────────────────────────────┘
              GERBANG 1 ✅ validate-schema.mjs → OK 290/0
                           ▼
┌─ TRANSPORT (server.mjs, tanpa auth) ────────────────────────┐
│ /api/file         →12 loader  SOURCE MENTAH   ← D22         │
│ /api/website/page → 3 loader  output kompilasi              │
│ /api/schema/page  → 1 loader  schema kompilasi              │
│ /api/tree · /admin (TinaCMS) publik           ← D10, D23    │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌─ RENDER (jvto-web) ─ 4 produsen → satu <script> ────────────┐
│ [A] ecosystemNodes  [B] globalNodes                          │
│ [C] StructuredData  [D] faqSchema                            │
└──────────────────────────┬───────────────────────────────────┘
              GERBANG 2 ⬜ validate-rendered-graph.mjs (BELUM)
                           ▼
┌─ ARTEFAK PUBLIK ────────────────────────────────────────────┐
│ 296 HTML  +  aset non-HTML (PDF/PNG)  ← D21 P0, TAK TERJAGA │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Empat + satu sebab struktural

| Sebab | Definisi | Temuan |
|---|---|---|
| **S1** Gerbang di artefak yang salah | Validasi jalan di graf terkompilasi; yang publik adalah merge 4 produsen tanpa kontrak | D1(tour), D2, D4, D5, D6, D13, D14, D17, **C011**, D23 |
| **S2** Kedalaman check tidak seragam | `checkNoMissingIds`/`checkNoDuplicateSingletons` hanya top-level | D17, memperdalam D5/D6/C011 |
| **S3** Inventaris URL dua pemilik | 290 manifest vs 296 sitemap tulis tangan | D7, D11, D15, D16 |
| **S4** Authority bocor ke consumer | Fakta kanonik di `jvto-web`; kopling lewat tata letak folder | D8*, D9, D18, D19, D22, D24* |
| **S5** ★ Lapisan aset tak pernah masuk scope | PDF/PNG tertaut halaman live tidak pernah diaudit siapa pun | **D21 (P0)** |

`*` sudah ditutup hari ini.

---

## 2 — KEPUTUSAN PEMROSESAN

### 2.1 UPDATE — data relevan, disesuaikan

| Data | Perubahan | Alasan |
|---|---|---|
| `foundingDate` di produksi | `verify-jvto/page.tsx:1048` `Since 2016` → **`Since 2015`** | Pemilik menetapkan 2015 (2026-08-30), menegaskan owner decision 2026-08-03 di `organization.json`. Satu-satunya string yang mengklaim tahun berdiri berbeda dari SSOT |
| 4 entri "incorporated 2016-01-01" | **Dipertahankan apa adanya** | Fakta legal pendirian PT, bukan klaim `foundingDate`. Menghapusnya akan menghilangkan bukti sah |
| `arsitektur-satu-graf-satu-gerbang.md` | 6 pernyataan salah dikoreksi di badan + §10 changelog | Run 2–3 membatalkan: "tidak ada P0", "governance tidak ada", "transport = /api/website/page", D1-homepage, D18, D10 |
| `render_chain_audit.md` | +Adendum C | Menutup D8, D12, D24; menambah C011; peta ID D↔C↔T |
| Skala severity D10 | P2 → **P1** | Endpoint `/api/tree` + `/api/file` menyajikan model biaya & decisions log tanpa auth. Run 1 menguji satu endpoint lalu menyimpulkan tentang host |
| Skala severity D18 | P2 → **P3** | Registry dihapus **sengaja** (`3925805f`, decision `validate-routes-registry`). Drift dokumen, bukan drift sistem |

### 2.2 COMBINE — duplikasi digabung

| Duplikat | Keputusan | Hasil |
|---|---|---|
| `live_html_url_audit_2026-08-30.csv` (saya) vs `baseline-2026-08-30/live_html_url_audit.csv` | **md5 identik** (`e264fdf9…`). Pertahankan satu: yang di folder baseline | Satu CSV bukti. Salinan saya sudah hilang saat folder ditata ulang — hasil yang benar, nol tindakan |
| Narasi audit saya vs paket CSV Mechanical Handoff | **Gabung lokasi.** Narasi masuk ke `baseline-2026-08-30/render_chain_audit.md` | Satu folder = satu run: 10 CSV/MD + 1 narasi. Sesuai "Standard Output Package" framework |
| Penomoran D (Render Chain) vs C (conflict register) vs T (handoff) | **Pertahankan ketiganya, tambah peta.** C dan T sudah jadi input `handoff_register.csv` | Tabel C.7: satu perkara → satu baris lintas tiga sistem ID. Nol penomoran ulang, nol tautan putus |
| Route inventory: `route-output-index.json` (290) vs 8 `sitemap.data.ts` (296) | **Manifest jadi pemilik tunggal** (rencana L2) | Belum dieksekusi — mengubah `sitemap.data.ts` menyentuh output publik |
| Contract `schema-contract.mjs` + `schema-types-index.json` + kontrak baru | **Jangan gabung.** Beda artefak: kode builder, indeks observasi, kontrak niat | Menggabungkan akan mencampur observasi dengan niat — persis kesalahan RGC v1 |
| Governance: standing rules (ingatan) vs `state/goals.json` | **`state/goals.json` yang menang** | Ia punya tanggal, alasan, dan dibaca otomatis oleh tooling. Ingatan tidak |

### 2.3 DELETE — tidak relevan, dibuang

| Data | Aksi | Alasan |
|---|---|---|
| `5-experience-engine/public-website/static-route-groups.json` | **→ `archive/reverse-extracted-2026-08-11/`** | `source.repo = /Users/macbook/Code/jvto-web@75a21d11`, `generatedAt 2026-08-11` — snapshot diekstrak **dari consumer ke SSOT**, arah authority terbalik. 19 hari lebih tua dari HEAD. **Nol pembaca** di kedua repo |
| `5-experience-engine/seo-metadata/page-metadata-index.json` | **→ arsip yang sama** | Provenance identik. Satu pembaca tersisa: `migrate-web-content-to-source.mjs` lewat `readJsonIfExists()` — migrasi selesai, fungsi mengembalikan `null` tanpa error |
| 3 npm script `*:registry` di `package.json` | **DIHAPUS** | Menunjuk `scripts/generate-registry.mjs` dan `scripts/validate.mjs` yang tidak ada; `build:registry` gagal. Residu registry yang dipensiunkan sengaja. Jebakan untuk developer berikutnya — namanya persis yang orang cari |
| Aturan standing "notice jembatan Madakaripura" | **DIPENSIUNKAN** → `retiredRules` di kontrak | Pemilik: jembatan sudah dibuka. Diverifikasi: nol catatan kerusakan jembatan di SSOT & git history. **Fakta basi, bukan notice yang hilang** |
| Klaim "registry `4-channel-outputs/` hilang = drift arsitektur" | **DIHAPUS dari peta** | Dihapus sengaja `3925805f` (2026-08-15), dicatat 2026-08-26. Yang basi adalah blueprint-nya |
| Temuan "D1 homepage = parity violation" | **DIHAPUS dari daftar cacat** | Decision `homepage-answer-block` (2026-08-27) menyatakannya disengaja **dan memperingatkan agar tidak dibalik oleh pengukuran** |
| False positive `singleton_duplicated: TouristTrip` | **DIHAPUS dari kontrak** | Node hari (`#day-N`) sah berulang sebagai `subTrip`. Pengecualian ditulis eksplisit agar tidak lahir lagi |
| Angka "22 tour packages" | **DIHAPUS sebagai fakta** | Tidak ada dasar di file mana pun. Rantai terlacak: `package-index.json` `count:16` + 1 `excludedFromMainPublicSnapshot` = **17** = 17 contract = 17 URL live |
| Angka "7 destinasi kanonik" | **DIGANTI** | `destinations-master.json` = 10 entri (3 kota + 1 technopark + 6 objek wisata) |

### 2.4 Yang sengaja TIDAK disentuh

| Item | Alasan |
|---|---|
| 8 `sitemap.data.ts` | Mengubahnya mengubah `sitemap.xml` publik. Butuh persetujuan eksplisit |
| `src/lib/tourFaqs.ts` (D9) | Migrasi authority. Tanpa gerbang HTML dulu, keberhasilannya tidak bisa dibuktikan |
| `validate-schema.mjs` | Memperdalam check = mengubah perilaku gate. Langkah L3, butuh persetujuan |
| PDF/PNG SIP dokter (D21, P0) | Backlog-nya sendiri: *"needs an owner decision, deliberately not actioned"*. Menghapus aset publik bersifat destruktif |
| `server.mjs` (D10/D23) | Menambah auth memutus 16 loader produksi bila salah urutan |
| 4 entri "incorporated 2016" | Fakta legal sah |

---

## 3 — ALUR PROSES YANG DIJALANKAN

```
[1] BACA   3 dokumen + template + 2 repo + memori
[2] FETCH  296 URL produksi, HTML mentah, parser JSON-LD rekursif
[3] BEDAH  route tree · 4 produsen schema · manifests · validator · package.json
[4] UJI    jalankan validate-schema.mjs sendiri
           → OK: 290 routes, 0 violations   ← TESIS TERBUKTI
[5] REDUKSI 20 temuan → 4 sebab struktural
[6] TERIMA input pemilik: D8=2015, D12=Madakaripura dibuka
[7] VALIDASI input terhadap data  ← D8 ternyata bukan sengketa fakta,
           melainkan 1 string yang melanggar owner decision 2026-08-03
[8] TEMUKAN pekerjaan konkuren (run 2–3) di repo yang sama
[9] VERIFIKASI klaimnya sendiri  ← C011 diverifikasi, TouristTrip ditarik
[10] SERAP koreksi: P0 ada · governance ada · transport 12/3/1 · homepage sah
[11] GENERATE kontrak dari CSV bukti, bukan dari desain
[12] KOREKSI kontrak (TouristTrip false positive) sebelum dikirim
[13] TANAM governance ref → gerbang tidak boleh membalik owner decision
[14] EKSEKUSI update · combine · delete
[15] REGRESI validate-schema.mjs → OK 290/0, tidak ada yang rusak
```

Titik terpenting: **[7]** dan **[9]** dan **[12]** — tiga tempat di mana input diterima lalu diuji, bukan langsung dipakai. Ketiganya mengubah hasil.

---

## 4 — RASIONALISASI EFISIENSI

### 4.1 Neraca kompleksitas

| | Ditambah | Dibuang |
|---|---|---|
| File | 1 kontrak + 3 dokumen | 2 file snapshot terbalik |
| Baris konfigurasi | 0 | 3 npm script mati |
| Aturan | 14 baselineViolations terukur | 1 aturan standing basi · 1 false positive · 1 mitos registry · 2 angka tanpa dasar |
| Perubahan kode produksi | **1 string** | — |

**Kompleksitas bersih turun**, dan satu-satunya sentuhan kode produksi adalah `2016`→`2015`.

### 4.2 Kenapa mengeksekusi kontrak lebih dulu, bukan perbaikan

Setiap perbaikan tanpa gerbang adalah perbaikan yang tidak bisa dibuktikan bertahan. Buktinya dari sistem ini sendiri: D1 pernah ditemukan sebagai "9 pertanyaan tanpa UI" di homepage, dan tiga minggu kemudian skalanya jadi 905 di 26 halaman — bukan karena diperbaiki lalu kambuh, tapi karena **tumbuh tanpa ada yang mengukur**.

Kontrak yang dibuat hari ini mereproduksi C005, C006, C010, C011 secara mekanis — **14 aturan, 459 route-instance** — tanpa seorang pun menuliskan temuannya lagi. Itu perbedaan antara temuan dan pengukuran.

### 4.3 Kenapa diturunkan dari CSV, bukan didesain

RGC v1 saya tulis dari observasi murni. Hasilnya langsung memperlihatkan cacatnya sendiri: `/entity` tidak punya `Organization` di `requiredNodes`, dan `reviews-detail` justru **mensyaratkan** `Product` yang seharusnya dilarang. Kontrak yang hanya mencerminkan realitas akan mengesahkan cacat.

Perbaikannya bukan menulis ulang dari kepala, tapi **lapisan intent di atas observasi** — dan **selisih antara keduanya adalah daftar cacat**, terhitung otomatis. Sekali jalan menghasilkan kontrak sekaligus baseline.

### 4.4 Kenapa gerbang harus mengutip decision log

Kesalahan run pertama pada D1-homepage adalah kesalahan **kelas**: pengukuran otomatis membalik keputusan pemilik yang tercatat — pada keputusan yang bahkan menuliskan peringatan bahwa hal itu akan terjadi.

Tanpa `governance.decisionsHonored`, gerbang baru akan mengulanginya setiap minggu, dan tim akan mematikannya. Dengan itu, gerbang membaca `state/goals.json` sebelum menegakkan aturannya sendiri. **Enam baris JSON menentukan apakah gerbang ini hidup enam bulan atau enam minggu.**

### 4.5 Kenapa batas ditulis eksplisit

`scopeBoundary` menyatakan bahwa D21 (P0) dan D10/D22/D23 **di luar jangkauan gerbang ini**. Arsitektur yang mengklaim menutup semuanya adalah arsitektur yang membuat orang berhenti mencari — dan D21 justru lolos persis karena setiap audit sebelumnya mengasumsikan HTML adalah seluruh permukaan.

---

## 5 — ROLLBACK / UNDO

Semua perubahan ada di working tree. **Nol commit, nol push, nol deploy. Produksi tidak tersentuh.**

### 5.1 Undo total

```bash
# ekosistem
cd jvto-ekosistem
git checkout -- package.json
git checkout -- 5-experience-engine/public-website/static-route-groups.json
git checkout -- 5-experience-engine/seo-metadata/page-metadata-index.json
rm -rf archive/reverse-extracted-2026-08-11
rm 5-experience-engine/manifests/rendered-graph-contract.json
rm docs/arsitektur-satu-graf-satu-gerbang-2026-08-30.md
rm docs/konsolidasi-eksekusi-2026-08-30.md

# web
cd ../jvto-web
git checkout -- "src/app/(website)/verify-jvto/page.tsx"
rm -rf docs/audit/baseline-2026-08-30      # HANYA bila paket audit juga ingin dibuang
```

### 5.2 Undo selektif

| Bila asumsi ini salah | Undo |
|---|---|
| `foundingDate` ternyata bukan 2015 | `git checkout -- "src/app/(website)/verify-jvto/page.tsx"`. Satu string, satu baris |
| Jembatan Madakaripura ternyata masih bermasalah | Hapus entri kedua di `globalRules.retiredRules` pada kontrak. Aturan standing hidup lagi. Tidak ada kode yang perlu diubah |
| 2 file arsip ternyata dibutuhkan | `git checkout -- <path>`, atau pindahkan balik dari `archive/reverse-extracted-2026-08-11/`. README arsip memuat instruksinya |
| `build:registry` ternyata masih dipakai | `git checkout -- package.json`. Tapi perintahnya tetap gagal — file targetnya memang tidak ada |
| Sebuah `requiredNode` di kontrak terlalu ketat | Edit satu entri di `routeGroups.<group>.requiredNodes`. Kontrak adalah data, bukan kode — tidak ada rebuild |
| Sebuah rule bertentangan dengan owner decision | Tambahkan `exemptions` dengan `decisionRef`. Polanya sudah ada di `routeGroups.home` |
| Peta ID D↔C↔T salah | Hanya dokumentasi di §C.7 `render_chain_audit.md`. Tidak ada yang membacanya secara mesin |

### 5.3 Yang TIDAK bisa di-undo dari sini

Tidak ada. Nol operasi destruktif dijalankan: penghapusan file dilakukan dengan `mv` ke `archive/`, bukan `rm`; perubahan kode berjumlah satu baris; semua artefak baru bersifat aditif.

### 5.4 Verifikasi bahwa tidak ada regresi

```bash
cd jvto-ekosistem && node scripts/validate-schema.mjs
# → OK: 290 routes validated, 0 violations     (dijalankan 2026-08-30, sesudah semua perubahan)

python3 -c "import json; json.load(open('package.json'))"   # JSON valid, 23 script tersisa
cd ../jvto-web && git diff --stat                            # 1 file, 1 insertion, 1 deletion
```
