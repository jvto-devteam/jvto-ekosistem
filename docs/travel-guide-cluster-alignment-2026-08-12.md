# Travel Guide Cluster Alignment Audit

> Update 2026-08-12: audit ini adalah snapshot sebelum alignment live. Setelah dicek ke sitemap dan HTTP live, 13 route tambahan Travel Guide yang ada di repo ternyata 404 di website live dan sudah dikeluarkan dari source/output. Travel Guide sekarang mengikuti 13 route live termasuk index. Lihat `docs/live-web-cluster-alignment-2026-08-12.md`.

Tanggal pemeriksaan: 2026-08-12

## Ringkasan keputusan

Cluster Travel Guide di `jvto-ekosistem` sudah cukup sesuai dengan konten lama yang ada di `jvto-web/content/pages/travel-guide` dan `jvto-web/content/faqs`.

Namun, belum 100% sesuai dengan website aktif dan desain/handoff terbaru karena ada tiga halaman Travel Guide yang sudah ada sebagai route website dan file desain, tetapi belum punya data kanonik di ekosistem:

- `/travel-guide/mount-bromo-logistics`
- `/travel-guide/tumpak-sewu-logistics`
- `/travel-guide/packing-list`

Artinya: data inti Travel Guide sudah banyak masuk, tetapi belum siap penuh sebagai render data untuk semua halaman Travel Guide website.

## Sumber yang diperiksa

Folder persis `/Users/macbook/Downloads/jvto-web` tidak ditemukan di disk saat audit. Pemeriksaan dilakukan terhadap sumber yang tersedia dan relevan:

- `/Users/macbook/Code/jvto-web/content/pages/travel-guide`
- `/Users/macbook/Code/jvto-web/content/faqs`
- `/Users/macbook/Code/jvto-web/src/app/(website)/travel-guide`
- `/Users/macbook/Downloads/jvto new on design system 2`
- `/Users/macbook/Code/jvto-ekosistem/1-knowledge-and-evidence-core`
- `/Users/macbook/Code/jvto-ekosistem/5-experience-engine/seo-metadata/page-metadata-index.json`

## Status per halaman website Travel Guide

| Route website | Status ekosistem | Catatan |
|---|---|---|
| `/travel-guide` | Sesuai | Ada di `stable-operational-guidance/travel-guide-pages/index.md` dan metadata index. |
| `/travel-guide/booking-information` | Sesuai | Ada di stable guidance, FAQ, desain, route website, dan metadata index. |
| `/travel-guide/faq` | Hampir sesuai | Konten ada sebagai `faqs/travel-guide-faq-page.json`, tetapi mapping nama perlu dibuat eksplisit karena route memakai slug `faq`. |
| `/travel-guide/ijen-health-screening` | Sesuai | Ada di health-and-safety, FAQ, desain, route website, dan metadata index. |
| `/travel-guide/safety-on-tours` | Sesuai | Ada di health-and-safety, FAQ, desain, route website, dan metadata index. |
| `/travel-guide/packing-and-fitness` | Sesuai | Ada di health-and-safety, FAQ, desain, route website, dan metadata index. |
| `/travel-guide/best-time-to-visit` | Sesuai | Ada sebagai JSON stable guidance, FAQ, desain/upload, route website, dan metadata index. |
| `/travel-guide/weather-and-closures` | Sesuai | Ada di health-and-safety, FAQ, desain, route website, dan metadata index. |
| `/travel-guide/police-escort-for-groups` | Sesuai | Ada sebagai JSON health-and-safety, desain, route website, dan metadata index. |
| `/travel-guide/rijik-monthly-closure` | Sesuai | Ada sebagai JSON health-and-safety, FAQ, route website, dan metadata index. |
| `/travel-guide/mount-bromo-logistics` | Belum sesuai | Ada di website TSX dan desain HTML, tetapi belum ada file data kanonik ekosistem dan belum ada metadata index. |
| `/travel-guide/tumpak-sewu-logistics` | Belum sesuai | Ada di website TSX dan desain HTML, tetapi belum ada file data kanonik ekosistem dan belum ada metadata index. |
| `/travel-guide/packing-list` | Belum sesuai | Ada di website TSX dan desain HTML, tetapi belum ada file data kanonik ekosistem dan belum ada metadata index. |

## Konten lama yang sudah masuk ekosistem

File-file berikut berasal dari `jvto-web/content/pages/travel-guide` dan sudah punya padanan di `jvto-ekosistem`:

- `what-is-included.md`
- `payment-and-deposit.md`
- `booking-safety.md`
- `vehicle-and-luggage.md`
- `rooming-and-accommodation.md`
- `how-booking-works.md`
- `safety-on-tours.md`
- `weather-and-closures.md`
- `rijik-monthly-closure.json`
- `best-time-to-visit.json`
- `private-tour.md`
- `booking-information.md`
- `ijen-health-screening.md`
- `cancellation-travel-credit.md`
- `packing-and-fitness.md`
- `why-stay-near-ijen.md`
- `blue-fire-and-sunrise.md`
- `malang-batu.md`
- `police-escort-for-groups.json`
- `finish-in-bali.md`
- `bromo-sunrise.md`
- `faq.json`

Catatan: beberapa file ini tidak muncul sebagai menu utama Travel Guide baru, tetapi tetap valid sebagai knowledge source dan historical public-content snapshot.

## Gap utama

### 1. Mount Bromo Logistics belum menjadi data ekosistem

Website sudah memiliki route:

- `/Users/macbook/Code/jvto-web/src/app/(website)/travel-guide/mount-bromo-logistics/page.tsx`

Desain/handoff juga ada:

- `/Users/macbook/Downloads/jvto new on design system 2/travel-guide-mount-bromo-logistics.html`
- `/Users/macbook/Downloads/jvto new on design system 2/design_handoff_jvto_website/pages/travel-guide-mount-bromo-logistics.html`

Isi penting yang perlu dijadikan data:

- Viewpoint Bromo: King Kong Hill, Penanjakan 1, Seruni Point, Mentigen Hill.
- Urutan malam: pickup, tiba Cemoro Lawang, jeep, viewpoint, sunrise, sea of sand/crater walk, Whispering Sands/Teletubbies, breakfast.
- Informasi altitude, udara dingin, jeep logistics, dan timing sunrise.

### 2. Tumpak Sewu Logistics belum menjadi data ekosistem

Website sudah memiliki route:

- `/Users/macbook/Code/jvto-web/src/app/(website)/travel-guide/tumpak-sewu-logistics/page.tsx`

Desain/handoff juga ada:

- `/Users/macbook/Downloads/jvto new on design system 2/travel-guide-tumpak-sewu-logistics.html`
- `/Users/macbook/Downloads/jvto new on design system 2/design_handoff_jvto_website/pages/travel-guide-tumpak-sewu-logistics.html`

Isi penting yang perlu dijadikan data:

- Best season: April sampai Oktober.
- Musim yang perlu dihindari/diwaspadai: Januari sampai Februari.
- Route descent: panorama viewpoint, stairs, bamboo ladder, river crossing, base of falls.
- Peralatan: hiking shoes dan dry bag.
- Penekanan safety canyon, water level, dan kondisi licin.

### 3. Packing List belum menjadi data ekosistem

Website sudah memiliki route:

- `/Users/macbook/Code/jvto-web/src/app/(website)/travel-guide/packing-list/page.tsx`

Desain/handoff juga ada:

- `/Users/macbook/Downloads/jvto new on design system 2/travel-guide-packing-list.html`
- `/Users/macbook/Downloads/jvto new on design system 2/design_handoff_jvto_website/pages/travel-guide-packing-list.html`

Isi penting yang perlu dijadikan data:

- Bromo lowest temperature sekitar 0C pada Juli sampai Agustus.
- Ijen wind chill dapat terasa sampai sekitar -5C di rim.
- Lowland temperature sekitar 28-32C.
- Tumpak Sewu canyon humidity 95%+.
- Layering pakaian, footwear, dry bag, rain layer, dan item praktis pendakian.

## Rekomendasi struktur data berikutnya

Untuk membuat cluster ini siap dipakai website, tambahkan data kanonik berikut:

- `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/mount-bromo-logistics.json`
- `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/tumpak-sewu-logistics.json`
- `1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/packing-list.json`

Tambahkan FAQ bila website membutuhkan blok FAQ per halaman:

- `1-knowledge-and-evidence-core/faqs/travel-guide-mount-bromo-logistics.json`
- `1-knowledge-and-evidence-core/faqs/travel-guide-tumpak-sewu-logistics.json`
- `1-knowledge-and-evidence-core/faqs/travel-guide-packing-list.json`

Tambahkan juga mapping render/metadata:

- `5-experience-engine/seo-metadata/page-metadata-index.json`
- render output untuk `/travel-guide/mount-bromo-logistics`
- render output untuk `/travel-guide/tumpak-sewu-logistics`
- render output untuk `/travel-guide/packing-list`
- alias eksplisit `travel-guide/faq` ke `1-knowledge-and-evidence-core/faqs/travel-guide-faq-page.json`

## Kesimpulan

Jawaban jujurnya: sudah sesuai untuk mayoritas data Travel Guide, tetapi belum lengkap untuk semua halaman Travel Guide yang ada di website/desain terbaru.

Sebelum migrasi website ke render data, tiga halaman route-level di atas perlu diangkat dari hardcoded TSX/design HTML menjadi data ekosistem. Setelah itu baru cluster Travel Guide bisa dipakai sebagai source of truth yang rapi untuk website, AI search, FAQ, dan handoff operasional.
