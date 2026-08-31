# JVTO — SATU GRAF, SATU GERBANG
### Konsolidasi arsitektur dari seluruh data audit, dokumen, dan kode
**Tanggal:** 2026-08-30 · **Basis:** `jvto-web@live 99673b2f` · `jvto-ekosistem@main fceb97d2` · produksi 296 URL

> **Catatan gate.** Dokumen ini melewati aturan "Section 7 kosong" atas instruksi eksplisit Sam untuk mengkonsolidasi dan mengarsitekturkan. Section 0–6 Render Chain Audit tetap murni observasi; keputusan arsitektur ada di sini, terpisah, dengan basis bukti yang sama.

---

## §0 — TESIS

Satu kalimat yang menjelaskan 20 temuan audit:

> **Sistem JVTO memvalidasi artefak yang salah.**
> Gerbang mutu berjalan pada JSON-LD yang dikompilasi ekosistem (`5-experience-engine/json-ld/pages/*.schema-output.json`, 290 file), dan melaporkan `OK: 290 routes validated, 0 violations`.
> Yang dibaca Google dan crawler AI adalah artefak lain: hasil **merge runtime** dari empat produsen berbeda di dalam satu tag `<script type="application/ld+json">`.
> **Artefak kedua itu tidak divalidasi oleh apa pun.**

Semua P1 di audit hidup di artefak kedua, atau di sambungan antara keduanya.

**Konsekuensi praktis:** menambah check ke `validate-schema.mjs` tidak akan menangkap satu pun dari D1, D2, D4, D7, D13, D14. Check-nya membaca file yang benar-benar bersih.

---

## §1 — PETA KONSOLIDASI

### 1.1 Sumber data yang dikonsolidasi

| # | Sumber | Jenis | Peran dalam peta |
|---|---|---|---|
| 1 | `satu_sistem.md` | dokumen visi | Model 7-plane (Governance → Canonical → Compilation → Distribution → Experience → Observability → Change) + 5 mekanisme orkestrasi |
| 2 | `Mechanical_Handoff_Framework__masih_relevan.md` | dokumen urutan kerja | Koreksi diri: mulai dari baseline faktual, bukan arsitektur besar |
| 3 | `JVTO_Website_Mechanical_Handoff_Framework.md` | dokumen mekanis | Phase 0–10, 12 file output package, taksonomi konflik |
| 4 | Render Chain Audit Template v1.0 | instrumen | Section 0–7 + aturan tag + gerbang falsifikasi |
| 5 | `jvto-ekosistem@main` | kode + data | SSOT + compiler + validator + manifests |
| 6 | `jvto-web@live` | kode | Renderer + 3 produsen schema lokal |
| 7 | Produksi (296 URL, HTML mentah) | fakta | Artefak yang benar-benar dibaca mesin |
| 8 | Standing rules JVTO | kebijakan | Batas yang tidak boleh dilanggar output |
| 9 | `docs/website-audit/2026-08-29/` | artefak audit sebelumnya | Output package Mechanical Handoff, sudah terisi |

**Temuan konsolidasi pertama:** sumber #9 baru saya temukan saat eksplorasi ini. Output package Mechanical Handoff **sudah pernah dijalankan 2026-08-29** — `url_inventory.csv`, `template_ownership_map.csv`, `source_to_output_contract.csv`, `live_html_url_audit.csv`, `group_summary.csv`, `schema_contract_check.csv`, `conflict_register.csv`, `handoff_register.csv` semuanya ada. Framework-nya bukan rencana; sudah dieksekusi kemarin.

### 1.2 Yang ternyata SUDAH DIBANGUN

Ini pembalikan paling penting terhadap asumsi awal. Dokumen `satu_sistem.md` menulis arsitektur target seolah belum ada. Realitas repo:

| Elemen dalam `satu_sistem.md` | Status nyata | Bukti |
|---|---|---|
| Canonical source (source of truth) | **ADA** | `1-…` s/d `4-operations-core`, 5 domain core |
| Compiler / generator | **ADA** | `render-web-content-sources.mjs`, `generate-review-schema.mjs`, `generate-tourist-trip-schema.mjs`, `run-generators.mjs` (10 generator terdaftar), `render-llms-txt.mjs` |
| Registry / entity index | **ADA, nama lain** | `5-experience-engine/manifests/route-output-index.json` — **290 route**, `generated_at 2026-08-30T05:58:13Z` |
| Dependency graph (source → output) | **ADA, satu lapis** | `manifests/source-output-map.json` — **51 mapping**, tiap source → daftar output |
| Schema contract | **ADA sebagai kode** | `scripts/lib/schema-contract.mjs` + `json-ld/schema-types-index.json` |
| Validation gate | **ADA** | `validate-schema.mjs`, 291 baris, **6 check** aktif |
| Channel outputs | **ADA** | `json-ld/pages/` (290), `public-website/pages/` (51), `seo-metadata/`, `knowledge-feed/`, `partner-feed/`, `analytics/`, `guest-portal/` |
| Event trigger / invalidasi | **ADA** | webhook `POST /api/revalidate/ecosystem-content` → `revalidateTag` ×3 + `revalidatePath(route)` **dan** `revalidatePath(route,"page")` |
| Runtime verification (live HTML) | **ADA** | `scripts/live-html-audit.mjs`, 321 baris |
| Observability data | **ADA** | `analytics/profitability-summary.json`, `google-review-insights.json`, `booking-channel-payment-readiness-summary.json` |
| CMS menulis ke source | **ADA & benar** | TinaCMS di ekosistem, collection path → `1-knowledge-and-evidence-core/*` |
| Governance / decisions log | **ADA** | `state/goals.json` — 9 decisions, 3 backlog, policies, baseline; dibaca otomatis oleh tooling |
| **Contract untuk graf yang DIRENDER** | **DIBUAT 2026-08-30** | `5-experience-engine/manifests/rendered-graph-contract.json` — 22 routeGroup, 296 route, 14 baselineViolations |

**Kesimpulan §1.2:** kira-kira **90% dari arsitektur yang dicita-citakan sudah berdiri** — termasuk control plane, yang hidup di `state/goals.json` dan tidak disebut oleh satu pun dokumen blueprint. Yang hilang bukan compiler, bukan registry, bukan gate, bukan governance. Yang hilang adalah **kontrak untuk artefak akhir** — dan per 2026-08-30 kontrak itu sudah ditulis.

### 1.3 Lapisan nyata (bukan versi dokumen)

Dokumen menyebut `4-channel-outputs/` berisi `entity-registry.json`, `route-manifest.json`, `schema-contract.json`, `seo-manifest.json`. Folder itu tidak ada. Struktur nyata, dipetakan ulang:

```
┌─ GOVERNANCE ────────────────────────────────────────────────┐
│ state/goals.json ← CONTROL PLANE SEBENARNYA                  │
│   9 decisions · 3 backlog · policies · baseline (2026-08-27) │
│ fact-review-and-ownership/ · docs/ (28 dok)                   │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌─ CANONICAL SOURCE ──────────────────────────────────────────┐
│ 1-knowledge-and-evidence-core   (20 subfolder domain)        │
│ 2-product-and-commercial-core   (17 product-contract)        │
│ 3-booking-and-journey-core                                   │
│ 4-operations-core               (9 subfolder operasional)    │
│ ← ditulis manusia + TinaCMS + sync (booking, google-reviews, │
│   llm-wiki)                                                  │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌─ COMPILER ──────────────────────────────────────────────────┐
│ render-web-content-sources · generate-review-schema           │
│ generate-tourist-trip-schema · run-generators (10 generator)  │
│ render-llms-txt · build-organization/person/tourist-trip      │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌─ COMPILED OUTPUT (5-experience-engine) ─────────────────────┐
│ json-ld/pages/            290 schema-output.json             │
│ public-website/pages/      51 website-output.json            │
│ manifests/route-output-index.json     290 route              │
│ manifests/source-output-map.json       51 mapping            │
│ seo-metadata/ · knowledge-feed/ · partner-feed/ · analytics/ │
└──────────────────────────┬───────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │   ✅ GERBANG ADA DI SINI │  validate-schema.mjs
              │   OK: 290 routes, 0 viol │  → HIJAU
              └────────────┬────────────┘
                           ▼
┌─ TRANSPORT ─────────────────────────────────────────────────┐
│ server.mjs @ ekosistem.javavolcano-touroperator.com          │
│   /api/file        →12 loader  (SOURCE MENTAH)               │
│   /api/website/page→ 3 loader  (output terkompilasi)         │
│   /api/schema/page → 1 loader  (schema terkompilasi)         │
│ fetch runtime + cache tag ISR + webhook revalidate           │
│ TANPA AUTH · TANPA RATE LIMIT · /admin TinaCMS publik        │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌─ RENDER (jvto-web) ─────────────────────────────────────────┐
│ 36 file dengan generateMetadata                              │
│ 4 PRODUSEN JSON-LD bergabung di satu <script>:               │
│   [A] ecosystemNodes  ← getEcosystemTourSchemaNodes()        │
│   [B] globalNodes     ← buildOrganizationJsonLd + WebSite    │
│   [C] StructuredData  ← graphSchema + tourAugment            │
│   [D] faqSchema       ← buildTourFaqSchema (3 sumber FAQ)    │
└──────────────────────────┬───────────────────────────────────┘
                           │
              ┌────────────┴────────────────────┐
              │   ❌ TIDAK ADA GERBANG DI SINI   │
              └────────────┬────────────────────┘
                           ▼
┌─ ARTEFAK YANG DIBACA MESIN ─────────────────────────────────┐
│ 296 halaman HTML · 905 Question tanpa bukti · 65 URL mati    │
│ 222 Product sintetis · /entity tanpa node identitas          │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Dua graf, satu halaman — inti masalah

Contoh nyata, `/tours/from-surabaya/ijen-2d1n`:

| Node class | Graf A (ekosistem, divalidasi) | Graf B (web-lokal, tidak divalidasi) | Yang muncul di HTML |
|---|---|---|---|
| `Organization/TravelAgency/LocalBusiness` | ✔ 1 | ✔ 1 (`buildOrganizationJsonLd`) | 1 (di-dedup) |
| `TouristTrip` | ✔ 3 | — | 3 |
| `TouristAttraction` | ✔ **11, tanpa `@id`** | — | 11 |
| `AggregateOffer` / `Offer` / `QuantitativeValue` | ✔ 1 / 6 / 6 | — | ✔ |
| `ItemList` / `ListItem` / `Place` | ✔ 3 / 13 / 1 | — | ✔ |
| `WebSite` | — | ✔ `buildWebSiteJsonLd` | 1 |
| `WebPage` | — | ✔ `StructuredData` | 1 |
| `BreadcrumbList` | — | ✔ `StructuredData` | 1 |
| `Product` | — | ✔ `StructuredData` | 1 |
| `Review` | — | ✔ `StructuredData` | 1 |
| `FAQPage` + `Question` ×28 | — | ✔ `buildTourFaqSchema` | 1 + 28 |

**Pembagian ini disengaja dan terdokumentasi.** Komentar di `scripts/lib/build-tourist-trip.mjs`:

> *"WebPage/BreadcrumbList/Product/... stay locally built in jvto-web"*

Dan `validate-schema.mjs` menulis pengecualian untuk mengakomodasinya:

> *"jvto-web builds that WebPage node itself and merges it into the same combined @graph at render time, so the reference resolves there — **it only looks dangling here because this check inspects one ekosistem file's @graph in isolation.**"*

**Pola yang terbaca dari komentar itu:** setiap kali gerbang bertemu batas dua-repo, yang terjadi adalah **menulis pengecualian**, bukan **memindahkan gerbang**. Ada tiga pengecualian eksplisit di `validate-schema.mjs` (external-entity ids, people ids, PDP `#webpage`). Masing-masing adalah tempat validator menyerah pada artefak nyata.

### 1.5 Blind spot kedua: kedalaman check tidak seragam

| Check | Cara iterasi | Konsekuensi |
|---|---|---|
| `checkNoMissingIds` | `graph["@graph"]` — **top level saja** | 353 `TouristAttraction` + 315 `AggregateRating` + 20 `FAQPage` tanpa `@id` **tidak terlihat** karena bersarang |
| `checkNoDuplicateSingletons` | `graph["@graph"]` — top level saja | duplikasi di dalam node bersarang lolos |
| `checkNoZeroRatings` | top level **+ `node.review[]` bersarang** | sudah diperbaiki |
| `checkDanglingReferences` | `walk()` rekursif penuh | benar |

Komentar di `checkNoZeroRatings` menyebutkan masalah ini secara harfiah: *"used to sail through undetected because this check only ever inspected the top level."* Perbaikannya diterapkan untuk rating, **tidak dirambatkan ke check `@id`**.

Ini bukan spekulasi — saya mengalami blind spot yang sama di pass pertama audit, dan baru menemukan 300 node `Review` di halaman crew setelah beralih ke parser rekursif.

### 1.6 Tiga inventaris URL yang bersaing

| Inventaris | Pemilik | Jumlah | Dipakai untuk |
|---|---|---|---|
| `manifests/route-output-index.json` | ekosistem | **290** | menentukan output file per route; hanya dipakai web untuk `lastmod` |
| 8 × `sitemap.data.ts` | **jvto-web**, ditulis tangan | **296** | isi `sitemap.xml` sesungguhnya |
| Route tree `src/app` | jvto-web | 296 + 5 pola di luar sitemap | apa yang benar-benar merender |

**Selisih 290 vs 296 = tepat 6 route:**
```
/entity
/destinations/ijen-crater
/destinations/madakaripura-waterfall
/destinations/mount-bromo
/destinations/papuma-beach
/destinations/tumpak-sewu-waterfall
```

`/entity` adalah satu-satunya halaman dari 296 yang kehilangan `Organization`, `WebSite`, `WebPage`, dan `BreadcrumbList` sekaligus (D7). **Ia juga satu-satunya halaman non-destinasi yang tidak punya entri di route-output-index.** Route yang tak terdaftar di manifest = route yang tak pernah tersentuh gerbang mana pun.

Komentar di `src/app/sitemap.ts` sudah mencatat insiden dari mekanisme yang sama:

> *"This list used to be typed out by hand, and it drifted — /travel-guide/best-time-to-visit and /travel-guide/rijik-monthly-closure were in the sitemap but missing from the list, so their `lastmod` fell back to request time and changed on every fetch."*

Perbaikannya waktu itu: mengambil `proseRoutes` dari route index. Tapi **daftar URL-nya sendiri tetap ditulis tangan di 8 file.**

### 1.7 Perintah mati di `package.json`

```json
"generate:registry": "node scripts/generate-registry.mjs",   ← file TIDAK ADA
"validate:registry": "node scripts/validate.mjs",            ← file TIDAK ADA
"build:registry":    "npm run generate:registry && npm run validate:registry"
```

`npm run build:registry` gagal. Manifests tetap ter-generate (`route-output-index.json` bertanggal hari ini) — berarti generatornya ada di jalur lain (`render-web-content-sources.mjs`). Tiga baris ini adalah **jebakan untuk developer berikutnya**: nama perintahnya persis yang dicari orang saat ingin membangun registry.

### 1.8 Authority terbalik pada dua file

```json
// 5-experience-engine/seo-metadata/page-metadata-index.json
// 5-experience-engine/public-website/static-route-groups.json
"source": {
  "repo": "/Users/macbook/Code/jvto-web",
  "ref": "origin/main",
  "commit": "75a21d11",
  "file": "src/lib/publicContent/generated/public-knowledge.json"
},
"generatedAt": "2026-08-11T06:56:02.151Z"
```

Dua file di ekosistem **diekstrak dari jvto-web**, bukan sebaliknya. Snapshot bertanggal 2026-08-11 dari commit `75a21d11` — 19 hari lebih tua dari HEAD hari ini. Ekosistem menyimpan cermin basi dari consumer-nya sendiri.

### 1.9 Redundansi terpetakan

| Fakta | Salinan 1 | Salinan 2 | Salinan 3 |
|---|---|---|---|
| NIB `1102230032918` | ekosistem organization-identity | `src/lib/tourFaqs.ts` → `NIB_NUMBER` | — |
| Nomor SE.35 BBKSDA | ekosistem credentials | `src/lib/tourFaqs.ts` (teks jawaban) | — |
| Tahun berdiri | `llms.txt` "2015 brand era; TDUP 2023-02-11" | `entityGraph.ts:225` `'2015'` | 4 file teks `"2016"` |
| Klaim harga entry | ekosistem pricing-rules | `tourFaqs.ts` "From IDR 1M/pax" | — |
| Identitas 1 crew | `/#crew-gufron` | `/our-team/gufron#person` | `/our-team/gufron` |
| Identitas 1 review | `/#review-134` | `/why-jvto/reviews/134#crew-gufron` | — |
| Inventaris URL | `route-output-index.json` (290) | 8× `sitemap.data.ts` (296) | route tree |
| Audit HTML live | `scripts/live-html-audit.mjs` (ekosistem) | audit run ini (docs/audit di jvto-web) | — |

---

## §2 — DIAGNOSIS: EMPAT PENYEBAB STRUKTURAL

20 temuan audit direduksi menjadi empat sebab. Tidak ada temuan yang tersisa di luar keempatnya.

| Sebab | Definisi mekanis | Temuan yang dihasilkannya |
|---|---|---|
| **S1 — Gerbang di artefak yang salah** | Validasi berjalan pada Graf A; yang dipublikasikan adalah merge Graf A + B. Tidak ada kontrak di titik merge. | **D1, D2, D4, D5, D6, D13, D14, D17** (8) |
| **S2 — Kedalaman check tidak seragam** | `checkNoMissingIds` & `checkNoDuplicateSingletons` hanya membaca top-level `@graph` | **D17** (memperdalam D5, D6) |
| **S3 — Inventaris URL dua pemilik** | 290 (manifest) vs 296 (sitemap tulis tangan); route tak terdaftar = route tak terjaga | **D7, D11, D13, D15, D16** (5) |
| **S4 — Authority bocor ke consumer** | Fakta kanonik hidup di `jvto-web`; dua file ekosistem diekstrak dari web | **D8, D9, D18, D19** (4) |
| Di luar keempatnya | Fakta operasional, bukan arsitektur | **D3** (URL destinasi mati — lihat catatan), **D10** (robots host ekosistem), **D12** (notice Madakaripura — UNKNOWN operasional), **D20** (konsistensi kosmetik) |

**Catatan D3.** URL `/destinations/{slug}` mati bersumber dari Graf A — ekosistem yang memancarkannya. Tapi ekosistem **tidak bisa tahu** route mana yang hidup di jvto-web, karena inventaris route yang otoritatif ada di `sitemap.data.ts` milik web (S3). Jadi D3 adalah **S1 × S3**: node lolos gerbang karena gerbangnya tidak pernah melihat HTML, dan tidak bisa memeriksa liveness karena inventaris route bukan miliknya.

**Verifikasi tesis:**

```
$ node scripts/validate-schema.mjs
OK: 290 routes validated, 0 violations
```

Gerbang hijau, di saat yang sama produksi membawa 905 klaim tanpa bukti dan 65 URL mati. **Ini bukan gerbang yang lemah. Ini gerbang yang menghadap arah lain.**

---

## §3 — ARSITEKTUR BARU: SATU GRAF, SATU GERBANG

### 3.1 Prinsip tunggal

> **HTML yang dirender adalah satu-satunya artefak yang penting.
> Maka HTML yang dirender adalah artefak yang harus divalidasi,
> dan setiap kelas node harus punya tepat satu pemilik.**

Tiga akibat langsung:
1. Gerbang pindah dari file kompilasi ke HTML produksi.
2. Kontrak ditulis untuk **graf gabungan**, bukan untuk salah satu produsen.
3. Semua pengecualian di `validate-schema.mjs` yang lahir dari batas dua-repo **dihapus** — karena check-nya sekarang berjalan setelah merge selesai.

### 3.2 Artefak baru — satu file

`5-experience-engine/manifests/rendered-graph-contract.json`

Satu-satunya benda baru dalam usulan ini. Bentuknya:

```json
{
  "schema_version": "jvto/contract/rendered-graph/v1",
  "generated_at": "2026-08-30T00:00:00Z",
  "routeGroups": {
    "tours/detail": {
      "match": "^/tours/(from-surabaya|from-bali)/[^/]+$",
      "requiredNodes": [
        { "type": "Organization", "owner": "web",       "id": "{origin}/#organization" },
        { "type": "WebSite",      "owner": "web",       "id": "{origin}/#website" },
        { "type": "WebPage",      "owner": "web",       "id": "{route}#webpage" },
        { "type": "BreadcrumbList","owner": "web",      "id": "{route}#breadcrumb" },
        { "type": "TouristTrip",  "owner": "ekosistem", "id": "{route}#tour" },
        { "type": "Product",      "owner": "web",       "id": "{route}#product" },
        { "type": "AggregateOffer","owner": "ekosistem","id": "{route}#aggregateOffer" }
      ],
      "rules": {
        "allNodesRequireId": true,
        "idMustBeAbsolute": true,
        "singletonTypes": ["WebSite", "WebPage", "BreadcrumbList", "FAQPage"],
        "urlLivenessRequired": ["TouristAttraction", "Product"],
        "uiParityRequired": [
          { "type": "FAQPage", "field": "mainEntity[].name", "mustAppearInRenderedText": true }
        ],
        "forbiddenNodes": []
      }
    },

    "why-jvto/reviews-detail": {
      "match": "^/why-jvto/reviews/\\d+$",
      "requiredNodes": [
        { "type": "Organization",    "owner": "web",       "id": "{origin}/#organization" },
        { "type": "WebPage",         "owner": "web",       "id": "{route}#webpage" },
        { "type": "BreadcrumbList",  "owner": "web",       "id": "{route}#breadcrumb" },
        { "type": "Review",          "owner": "ekosistem", "id": "{route}#review" }
      ],
      "rules": {
        "allNodesRequireId": true,
        "forbiddenNodes": ["Product"],
        "entityIdentity": {
          "Review": "one @id per real review across all routes"
        }
      }
    },

    "entity": {
      "match": "^/entity$",
      "requiredNodes": [
        { "type": "Organization", "owner": "web", "id": "{origin}/#organization" },
        { "type": "WebSite",      "owner": "web", "id": "{origin}/#website" },
        { "type": "WebPage",      "owner": "web", "id": "{route}#webpage" },
        { "type": "BreadcrumbList","owner": "web","id": "{route}#breadcrumb" }
      ]
    }
  },

  "globalRules": {
    "entityIdentity": {
      "Person:crew": "{origin}/why-jvto/our-team/{slug}#person",
      "Review":      "{origin}/why-jvto/reviews/{id}#review",
      "Organization":"{origin}/#organization"
    },
    "questionSemantics": {
      "Question.name": "must end with '?' or be an interrogative clause"
    }
  }
}
```

**Kenapa file ini, dan bukan yang lain:** `satu_sistem.md` menyebut *contracts* sebagai mekanisme orkestrasi #1 — *"Contract hanya mengatakan: kalau sesuatu adalah `product`, bentuknya harus seperti ini."* Semua mekanisme lain (registry, dependency graph, pipeline, event) **sudah ada**. Contract untuk artefak akhir adalah satu-satunya yang belum pernah ditulis.

### 3.3 Tabel kepemilikan — satu pemilik per kelas node

Diturunkan dari kondisi nyata hari ini, bukan dari desain ulang. Kolom "sekarang" adalah fakta terverifikasi.

| Kelas node | Pemilik sekarang | Pemilik dalam kontrak | Alasan |
|---|---|---|---|
| `Organization` / `TravelAgency` / `LocalBusiness` | **dua-duanya** (ekosistem + web) | **web** | web sudah punya `buildOrganizationJsonLd` dari data ekosistem; satu tempat merge |
| `WebSite`, `WebPage`, `BreadcrumbList` | web | **web** | sudah benar — ini fakta route, bukan fakta bisnis |
| `TouristTrip`, `Place`, `AggregateOffer`, `Offer`, `QuantitativeValue`, `ItemList` | ekosistem | **ekosistem** | sudah benar — fakta produk |
| `TouristAttraction` | ekosistem (tanpa `@id`, URL mati) | **ekosistem**, wajib `@id` + URL live | D3 tertutup oleh rule, bukan oleh rewrite |
| `Person` (crew) | **tiga namespace** | **ekosistem**, satu pola `@id` | D6 |
| `Review` | **dua namespace** | **ekosistem**, satu pola `@id` | D5 |
| `Product` | web (17 asli + 222 sintetis) | **ekosistem** untuk PDP; **dilarang** di halaman review | D4 |
| `FAQPage` + `Question` | web (`buildTourFaqSchema`, 3 sumber) | **web**, wajib lolos `uiParityRequired` | D1, D2 |
| `AggregateRating` | ekosistem (315 node tanpa `@id`) | **ekosistem**, wajib `@id` | D17 |

### 3.4 Perpindahan gerbang

```
SEBELUM                              SESUDAH
───────────────────────────────────  ───────────────────────────────────
compiler                             compiler
   ↓                                    ↓
schema-output.json (290)             schema-output.json (290)
   ↓                                    ↓
✅ validate-schema.mjs               ✅ validate-schema.mjs
   6 check, top-level                   6 check, REKURSIF
   3 pengecualian dua-repo              0 pengecualian dua-repo
   ↓                                    ↓
merge 4 produsen di runtime          merge 4 produsen di runtime
   ↓                                    ↓
HTML produksi                        HTML produksi
   ❌ tanpa gerbang                     ↓
                                     ✅ validate-rendered-graph.mjs
                                        kontrak RGC per route group
                                        parity · liveness · identity
                                        ↓
                                     laporan drift + exit code
```

Gerbang lama **tetap ada** — ia menangkap kesalahan lebih awal dan lebih murah. Yang berubah: ia tidak lagi menjadi satu-satunya, dan tidak lagi perlu berpura-pura memvalidasi sesuatu yang tidak ia lihat.

### 3.5 Yang dihapus (bukan ditambah)

Efisiensi arsitektur diukur dari apa yang bisa dibuang:

| Dibuang | Kenapa bisa dibuang |
|---|---|
| 3 blok pengecualian di `validate-schema.mjs` (external-entity ids, people ids, PDP `#webpage`) | Ada karena check membaca satu file terisolasi. Setelah gerbang membaca graf gabungan, referensinya benar-benar resolve |
| 8 file `sitemap.data.ts` sebagai **sumber daftar URL** | Jadi proyeksi dari `route-output-index.json`. File-nya boleh tetap ada untuk `priority`/`changefreq`, tapi tidak lagi memiliki daftar route |
| ~~3 baris `generate:registry` / `validate:registry` / `build:registry` di `package.json`~~ **SUDAH DIHAPUS 2026-08-30** | Menunjuk file yang tidak ada. Residu registry yang dipensiunkan sengaja (`3925805f`, 2026-08-15, decision `validate-routes-registry`). Sisi web sudah bersih; sisi ekosistem kini menyusul |
| ~~`page-metadata-index.json` + `static-route-groups.json`~~ **SUDAH DIARSIPKAN 2026-08-30** → `archive/reverse-extracted-2026-08-11/` | Snapshot terbalik dari jvto-web@75a21d11 (2026-08-11). Digantikan oleh RGC + route-output-index |
| Duplikasi fakta di `src/lib/tourFaqs.ts` | NIB, SE.35, nama dokter, klaim harga pindah ke ekosistem; file menyisakan struktur Q&A saja |

---

## §4 — ALUR PROSES

### 4.1 Alur normal (satu perubahan fakta)

```
[1] MANUSIA / TinaCMS / sync mengubah source
    └─ 1-…core / 2-…core / 3-…core / 4-operations-core

[2] COMPILER regenerate
    └─ render-web-content-sources · generate-*-schema · render-llms-txt
    └─ output: json-ld/pages · public-website/pages · manifests

[3] GERBANG 1 — INTEGRITAS SUMBER          validate-schema.mjs (rekursif)
    ├─ setiap node punya @id (semua kedalaman)
    ├─ tidak ada singleton ganda
    ├─ tidak ada rating nol/NaN
    ├─ tidak ada referensi @id menggantung
    ├─ setiap Organization punya @id
    ├─ TouristTrip dari source_trace terverifikasi
    └─ route-output-index sinkron dengan file di disk
         │ GAGAL → berhenti, tidak ada yang dipublikasikan
         ▼ LULUS

[4] GERBANG 2 — KONTRAK KONTRAK           validate-rendered-contract.mjs
    ├─ setiap route di route-output-index cocok dengan satu routeGroup RGC
    ├─ setiap requiredNode punya owner yang dideklarasikan
    └─ tidak ada kelas node dengan dua owner
         │ GAGAL → kontrak dan realitas tidak sinkron
         ▼ LULUS

[5] PUBLISH ekosistem → webhook revalidate ke jvto-web
    └─ revalidateTag ×3 + revalidatePath(route) + revalidatePath(route,"page")

[6] jvto-web merender: merge 4 produsen → HTML

[7] GERBANG 3 — GRAF TERENDER             validate-rendered-graph.mjs
    (perluasan live-html-audit.mjs yang sudah ada)
    ├─ fetch HTML mentah tiap route
    ├─ parse SEMUA blok ld+json, REKURSIF
    ├─ cek terhadap RGC:
    │   ├─ requiredNodes hadir?
    │   ├─ allNodesRequireId · idMustBeAbsolute
    │   ├─ singletonTypes tidak ganda
    │   ├─ forbiddenNodes absen              → D4
    │   ├─ urlLivenessRequired: HEAD 200      → D3
    │   ├─ uiParityRequired: Question.name    → D1
    │   │   harus muncul di teks terender
    │   ├─ questionSemantics                  → D2
    │   └─ entityIdentity: satu @id per       → D5, D6
    │       entitas nyata lintas route
    └─ output: rendered_graph_violations.csv + exit code

[8] OBSERVABILITY
    └─ diff CSV minggu ini vs minggu lalu = drift delta (Phase 10)
```

### 4.2 Posisi gerbang terhadap ISR — kenapa harus di HTML

ISR membuat halaman **diregenerasi setelah build**: `revalidate` 300–86400 detik, plus webhook. Gerbang di tahap build tidak bisa melihat halaman yang lahir 3 jam setelah deploy.

Bukti dari kode sendiri — insiden 2026-08-21 yang tercatat di `revalidate/ecosystem-content/route.ts`:

> *"11 crew pages stayed 404 on 2026-08-21 after a transient upstream blip baked notFound() into the cache: the route was in the revalidation set, was revalidated on every ekosistem deploy, and never came back."*

Build hijau, source hijau, deploy hijau — produksi 404 selama berhari-hari. **Hanya gerbang yang membaca HTML produksi yang bisa menangkap kelas kegagalan ini.** Itu argumen terkuat untuk memindahkan gerbang, dan argumennya berasal dari pengalaman JVTO sendiri, bukan dari teori.

---

## §5 — URUTAN EKSEKUSI

Tiga langkah. Berurutan. Tidak ada yang paralel karena langkah 2 memakai output langkah 1.

### Langkah 1 — Tulis RGC dari kondisi nyata

**Bukan mendesain dari kepala.** Diturunkan dari `docs/audit/live_html_url_audit_2026-08-30.csv` (296 baris, kolom `jsonld_types` + `jsonld_ids` sudah berisi kebenaran hari ini) dan dari `template_ownership_map.csv` yang sudah ada.

- Kelompokkan 296 URL ke ~14 routeGroup (sudah terhitung di audit)
- Untuk tiap group, `requiredNodes` = irisan node yang muncul di **semua** halaman group itu
- `owner` = ditentukan dari tabel §3.3
- `forbiddenNodes` = node yang muncul tapi tidak seharusnya (mis. `Product` di reviews-detail)

**Acceptance:** RGC memuat 100% route di `route-output-index.json` **dan** 6 route yang saat ini hanya ada di sitemap.
**Estimasi:** 1 hari. *[Estimasi]*

### Langkah 2 — Satukan inventaris route

- Tambahkan 6 route yang hilang (`/entity` + 5 destinasi detail) ke `route-output-index.json`
- Ubah 8 `sitemap.data.ts` menjadi proyeksi dari route index — daftar URL dibaca, bukan ditulis
- Deklarasikan `indexable: true|false` di route index; `/checkout`, `/my-booking`, `/3d/{slug}` masuk sebagai `indexable: false` (D11, D16 tertutup secara deklaratif)
- Hapus 3 baris registry mati di `package.json`; hapus dua file snapshot terbalik

**Acceptance:** jumlah route di `route-output-index.json` == jumlah `<url>` di `sitemap.xml` produksi. Hari ini 290 vs 296; target selisih 0.
**Estimasi:** 1 hari. *[Estimasi]*

### Langkah 3 — Pindahkan gerbang ke HTML

- Perdalam `checkNoMissingIds` dan `checkNoDuplicateSingletons` jadi rekursif (pola `walk()` sudah ada di `checkDanglingReferences`) — hapus 3 pengecualian dua-repo
- Perluas `live-html-audit.mjs` (321 baris, loop fetch + ekstraktor sudah ada) dengan: parser `@graph` rekursif, evaluator RGC, cek liveness URL, cek parity UI
- Wire ke `package.json` sebagai `audit:rendered-graph`
- Jalankan sekali sebagai baseline → `rendered_graph_violations.csv`

**Acceptance:** menjalankannya hari ini **harus** melaporkan D1, D2, D3, D4, D7, D13, D14, D17. Gerbang yang tidak menemukan temuan yang sudah terbukti ada adalah gerbang yang tidak bekerja.
**Estimasi:** 2 hari. *[Estimasi]*

**Total: 4 hari kerja.** *[Estimasi]* Setelah itu 15 dari 20 temuan tertangkap otomatis, selamanya.

### Yang dikerjakan setelahnya (bukan bagian usulan ini)

Migrasi authority `tourFaqs.ts` → ekosistem (S4/D9), dan penutupan D3/D4 secara konten. Keduanya baru bisa diverifikasi **setelah** gerbang langkah 3 berdiri — kalau tidak, tidak ada cara membuktikan perbaikannya berhasil dan tidak kembali.

---

## §6 — RASIONALISASI

### 6.1 Perbandingan eksplisit

| Jalur | Langkah | Estimasi | Temuan tertutup | Mencegah kambuh? | Kompleksitas baru |
|---|---|---|---|---|---|
| **A. Perbaiki 20 temuan satu per satu** | 20 task | ~10 hari *[Est.]* | 20/20 sekali | **Tidak** | 0 |
| **B. Bangun orchestration engine penuh** (`satu_sistem.md`: contracts + registries + dependency graph + event bus + gates) | ~40 task | berbulan-bulan *[Est.]* | 20/20 | Ya | **Sangat tinggi** — menulis ulang 90% mesin yang sudah jalan |
| **C. Gerbang di build jvto-web** (fail the build) | ~6 task | ~3 hari *[Est.]* | 8/20 | Sebagian | Sedang |
| **D. Satu Graf, Satu Gerbang** ← **PILIHAN** | **3 langkah** | **~4 hari** *[Est.]* | **15/20 otomatis + 5 terdeteksi** | **Ya** | **1 file baru** |

### 6.2 Kenapa A kalah

A memperbaiki nilai, bukan mekanisme. Setiap temuan yang ditutup akan kembali begitu ada perubahan berikutnya, karena **tidak ada satu pun check yang akan mendeteksinya**. Bukti: D1 (FAQPage tanpa UI) sudah pernah ditemukan pada audit sebelumnya untuk homepage; hari ini skalanya 905 pertanyaan di 26 halaman. Temuan itu tidak diperbaiki-lalu-kambuh — ia **tumbuh tanpa terlihat** karena tidak ada yang mengukurnya.

Biaya A: 10 hari, lalu berulang setiap kuartal. Biaya D: 4 hari, sekali.

### 6.3 Kenapa B kalah

B mengasumsikan mesinnya belum ada. §1.2 membuktikan sebaliknya: compiler, registry, dependency map, event trigger, 6 check validasi, 10 generator, audit script — semuanya sudah berdiri dan berjalan hari ini (`route-output-index.json` bertanggal hari ini, `validate-schema.mjs` lolos 290 route).

Membangun entity registry generik, dependency graph engine, dan event bus baru berarti **mengganti mesin yang bekerja dengan mesin yang belum terbukti**, sambil membawa serta semua defect yang belum dipahami. Dokumen `Mechanical_Handoff_Framework__masih_relevan.md` sudah menyimpulkan hal yang sama tiga minggu lalu: *"Jangan implementasikan arsitektur besar apa pun sebelum baseline tersebut selesai."* Baseline-nya baru selesai hari ini.

### 6.4 Kenapa C kalah

Menempatkan gerbang di build `jvto-web` masuk akal secara naluri dan salah secara mekanis. Alasannya ada di kodenya sendiri: **ISR meregenerasi halaman setelah build.** `revalidate` 300–86400 detik plus webhook `revalidatePath`. Insiden 11 halaman crew 404 pada 2026-08-21 terjadi **setelah** build yang hijau, dan bertahan berhari-hari.

C juga tidak bisa memeriksa liveness URL lintas-repo maupun parity UI, karena keduanya hanya terdefinisi pada HTML final. C menutup ~8 dari 20.

### 6.5 Kenapa D menang — empat alasan terukur

**(1) Menambah satu benda, membuang lima.**
Yang ditambah: 1 file kontrak. Yang dibuang: 3 pengecualian validator, 8 daftar URL tulis tangan, 3 perintah `package.json` mati, 2 file snapshot terbalik, duplikasi fakta di `tourFaqs.ts`. **Kompleksitas bersih turun.**

**(2) Memakai kembali yang sudah dibayar.**
`live-html-audit.mjs` (321 baris) sudah mem-fetch semua URL dan mengekstrak title/canonical/h1/jsonLdTypes. Yang perlu ditambah: parser graf rekursif + evaluator kontrak. `validate-schema.mjs` sudah punya 6 check dan pola `walk()` rekursif yang tinggal dirambatkan. `route-output-index.json` sudah memetakan 290 route ke output-nya. **Tidak ada infrastruktur baru.**

**(3) Menutup satu sebab, bukan dua puluh gejala.**
S1 sendirian menghasilkan 8 temuan. S3 menghasilkan 5. Langkah 2 dan 3 menutup keduanya — 13 temuan dari 2 langkah. Rasio ini tidak tersedia di jalur mana pun yang memperbaiki per-temuan.

**(4) Bisa dibuktikan pada hari pertama.**
Acceptance langkah 3 adalah: gerbang baru **harus** melaporkan temuan yang sudah terbukti ada di CSV audit hari ini. Kalau tidak, gerbangnya salah — dan kamu tahu itu dalam hitungan menit, bukan kuartal. Tidak ada jalur lain yang punya uji-diri sekuat ini, karena tidak ada jalur lain yang punya baseline 296-baris untuk diuji.

### 6.6 Risiko jalur D, dinyatakan jujur

| Risiko | Besarnya | Mitigasi yang sudah tersedia |
|---|---|---|
| RGC ditulis terlalu ketat → gerbang merah terus, tim mematikannya | Nyata. Ini cara gerbang mati di banyak tim | Turunkan RGC dari **kondisi nyata hari ini** (CSV audit), bukan dari ideal. Gerbang hijau di hari pertama kecuali untuk 15 temuan yang memang ingin ditangkap |
| Cek liveness URL menambah 70+ HTTP request per run | Kecil | Cache per-run, `HEAD` bukan `GET`, hanya URL unik (70, bukan 353) |
| Parity UI menghasilkan false positive karena parsing teks | Sedang | Sudah teruji di audit ini: 17 halaman kontrol (travel-guide, markets, why-jvto) menghasilkan gap **0** dengan parser yang sama. Parser bukan sumber noise |
| Gerbang berjalan pada produksi = mendeteksi setelah publik melihat | Nyata, dan tidak terhindarkan | Konsekuensi dari ISR. Mitigasi: jalankan juga terhadap preview deploy sebelum promote. Butuh U1 (akses Vercel) |

---

## §7 — YANG TIDAK BERUBAH

Usulan ini **tidak menyentuh** satu pun keputusan terkunci:

| Keputusan | Status dalam usulan |
|---|---|
| `jvto-ekosistem` = SSOT generator; `jvto-web` = consumer | **Diperkuat.** RGC menuliskan batas itu secara eksplisit untuk pertama kalinya |
| Pembagian produsen node (WebPage/Breadcrumb/Product di web) | **Dipertahankan.** Yang ditambahkan adalah kontrak untuk pembagian itu, bukan penghapusannya |
| Tidak migrasi Astro · tidak Sanity/Contentful · TinaCMS | Tidak disentuh |
| Booking hanya via website; WhatsApp support-only | Tidak disentuh |
| BCA-only · deposit 20% · Travel Credit | Tidak disentuh |
| Blue fire kondisional · destinasi kanonik | **Dapat ditegakkan otomatis** — masuk `globalRules` RGC |
| Urutan Mechanical Handoff Phase 0–10 | **Dilanjutkan.** Ini Phase 9 (handoff register) + Phase 10 (drift audit) yang dijadikan permanen |
| Next.js + PostgreSQL | Tidak disentuh |

Tidak ada rewrite. Tidak ada migrasi framework. Tidak ada perubahan pada 296 halaman yang sudah bersih secara mekanikal.

---

## §8 — DAMPAK TERHADAP 20 TEMUAN

| Temuan | Ditutup oleh | Cara |
|---|---|---|
| D1 Parity FAQ (905) | Langkah 1+3 | `uiParityRequired` |
| D2 Question dari pillar (102) | Langkah 1+3 | `questionSemantics` |
| D3 65 URL destinasi mati | Langkah 1+3 | `urlLivenessRequired` |
| D4 222 Product sintetis | Langkah 1+3 | `forbiddenNodes` di reviews-detail |
| D5 Review identitas ganda | Langkah 1+3 | `entityIdentity` |
| D6 Person 27 @id | Langkah 1+3 | `entityIdentity` |
| D7 /entity tanpa node identitas | Langkah 2+3 | route masuk manifest → `requiredNodes` |
| D11 /checkout & /my-booking indexable | Langkah 2 | `indexable: false` deklaratif |
| D13 Breadcrumb hilang 223 halaman | Langkah 1+3 | `requiredNodes` |
| D14 WebPage hilang 7 halaman | Langkah 1+3 | `requiredNodes` |
| D15 Coverage destinasi 5/10 | Langkah 2 | selisih manifest terlihat |
| D16 /3d shadow route | Langkah 2 | masuk manifest, `indexable: false` |
| D17 Node tanpa @id | Langkah 3 | check rekursif |
| D18 Dokumen vs repo | Langkah 2 | RGC jadi dokumen arsitektur yang hidup |
| D19 "22 paket" basi | Langkah 2 | manifest jadi angka otoritatif |
| D20 dynamicParams tidak seragam | — | kosmetik, tidak diprioritaskan |
| **D8** foundingDate 2015 vs 2016 | **tidak** | keputusan fakta, bukan mekanisme — butuh Sam |
| **D9** tourFaqs.ts authority | **tidak** | migrasi authority, dikerjakan setelah gerbang berdiri |
| **D10** robots host ekosistem | **tidak** | konfigurasi Cloudflare, terpisah |
| **D12** notice Madakaripura | **tidak** | **UNKNOWN operasional — hanya Sam yang bisa menjawab** |

**15 dari 20 tertutup dan terjaga. 4 sisanya butuh keputusan atau tindakan di luar arsitektur. 1 kosmetik.**

---

## §9 — SATU KALIMAT UNTUK DIBAWA

> Jangan bangun mesin baru. Mesinnya sudah jalan.
> Pindahkan gerbangnya ke tempat kebenaran benar-benar diukur — HTML yang dibaca mesin —
> dan tuliskan satu kontrak untuk graf yang keluar dari sana.
> Empat hari kerja, satu file baru, lima hal dibuang, lima belas temuan terjaga selamanya.

---
---

# §10 — KONSOLIDASI & KOREKSI (revisi 2026-08-30, setelah penggabungan run 1–3)

Dokumen ini ditulis dari run pertama. Run kedua dan ketiga — berjalan konkuren di repo yang sama — menghasilkan bukti yang **membatalkan tiga kesimpulan di badan dokumen**. Koreksinya ditulis di sini dan sudah diterapkan ke badan dokumen; tidak ada pernyataan usang yang dibiarkan berdiri.

## 10.1 — Yang DITARIK

| Pernyataan run pertama | Bukti yang menjatuhkan | Status |
|---|---|---|
| *"Tidak ada temuan P0."* | **D21** — `/screening/SIP_DOKTER_AHMAD_IRWANDANU_2026.pdf` (HTTP 200, 409.950 byte) dan turunan PNG-nya memuat alamat rumah, tanggal lahir, dan foto **pihak ketiga**. Ditautkan dari 4 halaman live, tidak diblokir `robots.txt`. Sudah tercatat di backlog ekosistem `sip-document-personal-data` (2026-08-27, *"needs an owner decision"*). PDF tidak mengandung lapisan teks → **tembus dari setiap checker berbasis teks**. | **DITARIK. Ada P0.** |
| *"Governance plane = standing rules + docs/"* | `state/goals.json` (2026-08-27): 9 `decisions`, 3 `backlog`, `policies`, `baseline`. Komentar filenya: *"Edit this file; do not duplicate its facts into a checker."* Control plane yang dicari `satu_sistem.md` sudah ada, dalam bentuk yang tidak satu pun dokumen blueprint sebutkan. | **DIKOREKSI.** |
| *"jvto-web fetch `ekosistem.*/api/website/page`"* | Hanya **3 dari 16** loader. Rasio sebenarnya: `/api/file` **12 loader (source mentah)**, `/api/website/page` 3, `/api/schema/page` 1, tanpa-fetch 2. | **DIKOREKSI.** |
| *"D1 homepage: 9 Question / 0 UI = parity violation"* | Decision `homepage-answer-block` (**2026-08-27**): hero homepage sengaja tanpa answer block; jawaban entitas tetap mengalir ke `home.website-output.json` + knowledge feed. Keputusan itu **secara eksplisit memperingatkan** agar tidak dibalik oleh pengukuran — dan run pertama langsung membaliknya. | **DITARIK untuk homepage.** Baris tour/hub/verify-jvto **bertahan**. |
| *"D18 registry hilang = drift arsitektur (P2)"* | Decision `validate-routes-registry` (2026-08-26): check-nya **dipensiunkan, bukan rusak**; `src/lib/registry/pages.ts` dihapus sengaja `3925805f` (2026-08-15). | **DITURUNKAN ke P3** — drift dokumen, bukan drift sistem. |
| *"D10 host ekosistem P2, API ter-scope"* | Run pertama menguji satu endpoint lalu menyimpulkan tentang host. `server.mjs` juga melayani `/api/tree` (216 KB, 1.296 file) dan `/api/file?path=…` yang mengembalikan `cost-components.json` dan `state/goals.json` penuh. Tanpa auth, tanpa rate limit; `/admin` TinaCMS tersaji publik. Path traversal terblokir; PII pelanggan **tersanitasi dengan sengaja** (field `privacy` di `booking-records.json`). | **DINAIKKAN P2 → P1.** Paparan **komersial**, bukan privasi. |

## 10.2 — Temuan baru yang masuk peta

| # | Temuan | Sebab struktural | Severity |
|---|---|---|---|
| **D21** | Aset non-HTML memuat data pribadi pihak ketiga | **S5 — baru: lapisan aset tidak pernah masuk scope audit mana pun** | **P0** |
| **D22** | `/api/file` adalah dependensi produksi: 12 loader mem-fetch **source mentah**. Kopling nyata antar-repo adalah **tata letak folder**, bukan kontrak. Rename folder → loader `null` → field hilang, tanpa error build | **S4** (authority) + **S1** (tanpa kontrak di sambungan) | **P1** |
| **D23** | `server.mjs` = single point of failure tanpa auth/rate-limit; fallback `readLocal()` gagal **senyap** → `notFound()` terpanggang ke cache ISR (insiden 11 halaman crew 404, 2026-08-21) | **S1** — sambungan tanpa kontrak, kegagalan tidak terdeteksi | **P1** |
| **D24** | 3 npm script ekosistem menunjuk file yang tidak ada | **S4** | **P3 — SUDAH DITUTUP 2026-08-30** |
| **C011** | 5 halaman mengemit **2 node `WebPage`** (`/destinations/ijen-crater`, 3 halaman policy, `/verify-jvto`) — diverifikasi independen | **S1** | **P2 — masuk `baselineViolations` RGC** |

## 10.3 — Batas kejujuran arsitektur ini

**RGC + gerbang HTML tidak menutup semuanya, dan tidak boleh dijual seolah begitu.** Batasnya ditulis eksplisit di `scopeBoundary` dalam file kontrak:

| Ditutup gerbang ini | TIDAK ditutup gerbang ini |
|---|---|
| Graf JSON-LD terender per route | **Aset non-HTML (D21, P0)** — PDF tanpa lapisan teks tembus dari semua checker berbasis teks; butuh inventaris aset + tinjauan manusia |
| Kehadiran & larangan node | **Keamanan transport (D10, D22, D23)** — soal auth, rate limit, dan kopling path; bukan soal isi graf. Jalurnya handoff `T001` |
| Pola `@id` & identitas entitas | Keputusan fakta bisnis (mis. angka publik partner hotel: 27 / 17 / 23) |
| Singleton, parity FAQ, liveness URL | Isi repo `jvto-devteam/jvto-ops` (privat, belum pernah masuk scope audit mana pun) |

## 10.4 — Mekanisme baru yang lahir dari koreksi ini

Kesalahan D1-homepage adalah kesalahan **kelas**, bukan kesalahan angka: gerbang otomatis membalik keputusan pemilik yang tercatat. Pencegahnya sudah ditanam ke dalam kontrak:

```json
"governance": {
  "source": "state/goals.json",
  "rule": "Setiap rule di kontrak ini yang bertentangan dengan sebuah decision
           di state/goals.json BATAL. Gerbang tidak boleh membalik keputusan
           pemilik yang tercatat.",
  "decisionsHonored": ["homepage-answer-block", "per-tour-aggregate-rating",
                       "validate-routes-registry", "content-signal-ai-train",
                       "madakaripura-height", "answer-first-fact-count-severity"]
}
```

`routeGroups.home` kini membawa `exemptions` dengan `decisionRef: "homepage-answer-block"`. Gerbang membaca decision log sebelum menegakkan aturannya sendiri — **itu perbedaan antara gerbang dan sensor.**

## 10.5 — Status eksekusi §5

| Langkah | Status |
|---|---|
| **L1** Tulis RGC dari kondisi nyata | ✅ **SELESAI** — `manifests/rendered-graph-contract.json`, 22 routeGroup, 296 route, 14 `baselineViolations` (459 route-instance), governance refs, scope boundary |
| **L2** Satukan inventaris route | ◐ **SEBAGIAN** — 2 file snapshot terbalik diarsipkan; 3 npm script mati dihapus. **Belum:** 6 route ditambahkan ke `route-output-index.json`; 8 `sitemap.data.ts` dijadikan proyeksi |
| **L3** Pindahkan gerbang ke HTML | ⬜ **BELUM** — `validate-rendered-graph.mjs` sebagai perluasan `live-html-audit.mjs`; perdalam `checkNoMissingIds`/`checkNoDuplicateSingletons` jadi rekursif |
| **L4** *(baru)* Inventaris aset non-HTML | ⬜ **BELUM** — konsekuensi D21; di luar RGC |
| **L5** *(baru)* Hardening `server.mjs` | ⬜ **BELUM** — handoff `T001`; konsekuensi D10/D22/D23 |

Estimasi revisi: **~4 hari** untuk L2–L3 *(tidak berubah)*, **+1 hari** untuk L4, **+1–2 hari** untuk L5. *[Estimasi]*
