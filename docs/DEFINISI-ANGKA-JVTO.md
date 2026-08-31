# DEFINISI ANGKA JVTO

**Fungsi:** satu tempat untuk setiap angka yang dipakai JVTO ke luar — schema, llms.txt, materi B2B, jawaban WhatsApp agent, laporan. Angka yang tidak ada di sini tidak punya dasar.

**Diukur:** 2026-08-30 · **Pin:** `jvto-web@live 99673b2f` · `jvto-ekosistem@main fceb97d2` · fetch 296 URL produksi

**Aturan:** satu metrik = satu nama, satu scope, satu sumber, satu tanggal, satu pemilik. Kalau dua angka berbeda untuk hal yang mirip, keduanya dapat nama sendiri — bukan salah satu dibuang.

---

## A. Angka yang boleh dipakai ke publik

| Metrik | Nilai | Scope | Sumber (perintah reproduksi) | Pemilik |
|---|---:|---|---|---|
| **Paket tur** | **17** | paket yang punya product contract **dan** halaman publik | `ls 2-product-and-commercial-core/tour-products/*.product-contract.json \| wc -l` → 17; live: 13 PDP `from-surabaya` + 4 `from-bali` | BELUM DITETAPKAN |
| **Crew** | **11** | crew yang punya profil publik | `crew-reviews.json` → `crew[]` = 11; live: 11 URL `/why-jvto/our-team/{slug}` | BELUM DITETAPKAN |
| **Review** | **222** | review di korpus, **dan** permalink publik — angkanya sama | `reviews.json` → `reviews[]` = 222; live: 222 URL `/why-jvto/reviews/{id}` | BELUM DITETAPKAN |
| **Destinasi berhalaman** | **5** | destinasi yang punya halaman detail publik | 5 file `*.content.json` di `destination-knowledge/`; live: 5 URL `/destinations/{slug}` | BELUM DITETAPKAN |
| **Halaman publik** | **296** | URL di `sitemap.xml`, semua HTTP 200 | `curl -s $SITE/sitemap.xml \| grep -c '<loc>'` | BELUM DITETAPKAN |

---

## B. Angka internal — jangan dipakai ke publik tanpa scope

| Metrik | Nilai | Scope | Kenapa beda dari kolom A |
|---|---:|---|---|
| Destinasi di master | **10** | seluruh entri `destinations-master.json` | Termasuk 3 kota (Bali, Surabaya, Malang City), Coffee & Cocoa Technopark, dan Taman Safari Prigen — **5 di antaranya tidak punya halaman** |
| Hotel di master | **27** | `hotels-master.json` → `hotels[]`, `confidence: verified`, ditarik dari endpoint backoffice | Data operasional. **Nol halaman publik**, dan itu benar — hotel adalah runtime state, bukan canonical knowledge |
| Hotel partner summary | **17** | `hotel-partner-summary.json` → `hotels[]` | Subset dari 27. Kriteria pembeda **belum terdokumentasi** |
| Halaman website-output | **51** | `5-experience-engine/public-website/pages/*.website-output.json` | Hanya route yang melewati compiler. **Bukan** total halaman situs |
| Halaman JSON-LD output | **290** | `5-experience-engine/json-ld/pages/*` | Lapisan schema, bukan lapisan route |
| npm script ekosistem | **26** | `package.json` → `scripts` | 3 di antaranya menunjuk file yang tidak ada (`generate:registry`, `validate:registry`, `build:registry`) |
| npm script web | **18** | `package.json` → `scripts` | |
| Loader ekosistem di web | **18** | `src/lib/ecosystemContent/*.ts` | 12 baca source mentah, 3 baca output terkompilasi, 1 baca schema, 2 helper |

---

## C. Angka schema — JANGAN disalin ke sini

Angka pengukuran schema hidup di `jvto-web/docs/audit/baseline-2026-08-30/schema_contract_check.csv`
(296 baris × 14 kolom, satu baris per URL). Menyalinnya ke sini akan membuatnya basi dalam hitungan hari.

Reproduksi ringkasannya:

```bash
python3 - <<'EOF'
import csv,collections
r=list(csv.DictReader(open('schema_contract_check.csv',encoding='utf-8')))
print("halaman                 :",len(r))
print("FAQ parity GAP          :",sum(1 for x in r if x['faq_parity']=='GAP'))
print("Question schema         :",sum(int(x['faq_questions_schema']) for x in r))
print("Question tampil         :",sum(int(x['faq_questions_visible'] or 0) for x in r))
print("tanpa Organization JVTO :",[x['path'] for x in r if x['has_org_jvto']=='N'])
print("tanpa BreadcrumbList    :",sum(1 for x in r if x['has_breadcrumb']=='N'))
print("singleton violation     :",[(x['path'],x['singleton_violation']) for x in r if x['singleton_violation']])
EOF
```

Nilai per 2026-08-30 ada di `conflict_register.csv` (C001–C012), bukan di dokumen ini.

---

## D. Angka BASI — jangan dipakai lagi

| Angka basi | Beredar di | Angka benar |
|---|---|---|
| **22** paket tur | catatan lama | **17** |
| **16** paket tur | `package-index.json` (di-generate 11 Agu) + `package-catalog-index.json` | **17** — indexnya mencatat 16 aktif + 1 di `excludedFromMainPublicSnapshot` (`tumpak-sewu-bromo-3d2n`, kini publik) |
| **7** destinasi kanonik | catatan lama | **10** di master, **5** berhalaman |
| **23** partner hotel | catatan lama | **27** master / **17** summary |
| **39** review tamu | catatan lama | **222** |
| **221** review | backlog `state/goals.json` | **222** — `reviews.json` dihitung ulang 30 Agu |
| **56** route | inventaris metadata lama | arsip; jangan dipakai sebagai total situs |
| **295** route | baseline `goals.json` 27 Agu | **296** per 30 Agu — bukan konflik, beda tanggal |
| **289** halaman JSON-LD | Kerangka Besar | **290** per 30 Agu — beda tanggal |
| **411 vs 258** commit `main` vs `live` | Kerangka Besar | **Branch `main` tidak ada.** `jvto-web` hanya punya `live` |
| **36** npm script (22 ekosistem + 14 web) | README `jvto-ops` | **44** — 26 ekosistem + 18 web |

---

## E. Tindakan yang mengunci ini

1. Isi kolom **Pemilik** di tabel A. Tanpa pemilik, angka akan menyimpang lagi.
2. Regenerasi atau hapus `package-index.json` dan `package-catalog-index.json` — keduanya sumber langsung kebingungan 16 vs 17.
3. Perbarui backlog `pdp-reviews-twelve-packages-unattributed` di `state/goals.json`: "221 reviews" → 222.
4. Tabel D dijadikan daftar larangan: angka di kolom kiri tidak boleh muncul di output mana pun.

---

## F. Keputusan pemilik — tertutup 2026-08-30

Dicatat agar tidak dibuka ulang di sesi berikutnya.

| Item | Keputusan | Konsekuensi administratif yang tersisa |
|---|---|---|
| Dokumen SIP dokter memuat data pribadi pihak ketiga (alamat RT/RW, tanggal lahir, foto). PDF + PNG live, ditautkan 4 halaman. | **Biarkan apa adanya** | Backlog `sip-document-personal-data` di `state/goals.json` masih berstatus *"open — needs an owner decision"*, jadi `jvto-ops` melaporkannya tiap SessionStart. Tutup statusnya. (task T014) |
| `jvto-devteam/jvto-ops` publik padahal `state/goals.json` mencatat privat. | **Biarkan.** Tidak ada jalur ke website. | `state/goals.json` memuat satu pernyataan yang tidak benar. Koreksi baris `jvto-ops-repo-visibility` ke "public". (task T014) |
| `/api/tree` + `/api/file` di host ekosistem terbaca tanpa auth. | **Biarkan** paparannya. | Paparannya ditutup. **Ketergantungannya tidak** — `/api/file` adalah jalur data produksi untuk 12 dari 18 loader. Itu task T001, bukan isu keamanan. |

---

## G. Aturan agar dokumen ini tidak jadi tumpukan

1. Angka pengukuran hidup di CSV, bukan di markdown. Markdown hanya untuk **definisi** dan **keputusan**.
2. Dokumen perencanaan baru wajib menyebut dokumen mana yang digantikannya.
3. Kalau isinya sudah ada di `baseline-*/`, hapus markdown-nya.
