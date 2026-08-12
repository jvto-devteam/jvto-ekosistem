# Live Web Cluster Alignment

Tanggal pemeriksaan: 2026-08-12

## Tujuan

Menyesuaikan source dan output cluster website di `jvto-ekosistem` dengan route publik yang benar-benar ada di live website `javavolcano-touroperator.com`.

Cluster yang diperiksa:

- `/travel-guide`
- `/policy`
- `/why-jvto`

## Sumber Verifikasi

- Sitemap live: `https://javavolcano-touroperator.com/sitemap.xml`
- HTTP check langsung ke route yang diragukan
- Source live-code lokal: `/Users/macbook/Code/jvto-web`

## Hasil Akhir

Total route source/output setelah alignment: 34.

- Travel Guide: 13 route
- Policy: 4 route
- Why JVTO: 17 route

Perbandingan akhir terhadap sitemap live:

```json
{
  "liveCount": 34,
  "repoCount": 34,
  "missingInRepo": [],
  "extraInRepo": []
}
```

## Route Travel Guide yang Dipertahankan

- `/travel-guide`
- `/travel-guide/best-time-to-visit`
- `/travel-guide/booking-information`
- `/travel-guide/faq`
- `/travel-guide/ijen-health-screening`
- `/travel-guide/mount-bromo-logistics`
- `/travel-guide/packing-and-fitness`
- `/travel-guide/packing-list`
- `/travel-guide/police-escort-for-groups`
- `/travel-guide/rijik-monthly-closure`
- `/travel-guide/safety-on-tours`
- `/travel-guide/tumpak-sewu-logistics`
- `/travel-guide/weather-and-closures`

## Route Travel Guide yang Dikeluarkan

Route berikut ada di repo ekosistem sebelumnya, tetapi live website mengembalikan 404:

- `/travel-guide/blue-fire-and-sunrise`
- `/travel-guide/booking-safety`
- `/travel-guide/bromo-sunrise`
- `/travel-guide/cancellation-travel-credit`
- `/travel-guide/finish-in-bali`
- `/travel-guide/how-booking-works`
- `/travel-guide/malang-batu`
- `/travel-guide/payment-and-deposit`
- `/travel-guide/private-tour`
- `/travel-guide/rooming-and-accommodation`
- `/travel-guide/vehicle-and-luggage`
- `/travel-guide/what-is-included`
- `/travel-guide/why-stay-near-ijen`

File source dan output generated untuk route di atas sudah dihapus.

## Route Policy yang Dipertahankan

- `/policy`
- `/policy/booking-payment-cancellation`
- `/policy/inclusions-exclusions`
- `/policy/privacy`

## Route Why JVTO yang Dipertahankan

- `/why-jvto`
- `/why-jvto/community-standards`
- `/why-jvto/our-story`
- `/why-jvto/our-team`
- `/why-jvto/reviews`
- `/why-jvto/the-jvto-difference`

## Route Crew Detail Why JVTO yang Ditambahkan

Route berikut ada di live sitemap dan mengembalikan HTTP 200, tetapi belum ada sebagai source route-level di repo:

- `/why-jvto/our-team/anjas`
- `/why-jvto/our-team/gufron`
- `/why-jvto/our-team/rendi`
- `/why-jvto/our-team/boy`
- `/why-jvto/our-team/kiki`
- `/why-jvto/our-team/taufik`
- `/why-jvto/our-team/fauzi`
- `/why-jvto/our-team/fredi`
- `/why-jvto/our-team/joyo`
- `/why-jvto/our-team/yandi`
- `/why-jvto/our-team/holili`

Source crew detail dibuat dari:

- `/Users/macbook/Code/jvto-web/content/entities/people.json`
- `/Users/macbook/Code/jvto-web/content/pages/why-jvto/our-team.json`
- `/Users/macbook/Code/jvto-web/content/entities/crew-reviews.json`
- `/Users/macbook/Code/jvto-web/src/app/(website)/why-jvto/our-team/[slug]/page.tsx`

Catatan privasi: field `phone` dari source `our-team.json` tidak dimasukkan ke source route-level ekosistem karena live crew detail page tidak merender nomor telepon.

## Validasi

- `npm run cms:audit -- --verbose` berhasil.
- `npm run render:web-content` berhasil dengan `sourceCount: 34`.
- `npm run cms:build` berhasil.
- `/api/website/page?route=/why-jvto/our-team/anjas` berhasil mengembalikan page output dan 5 featured reviews.
- `/api/website/page?route=/travel-guide/blue-fire-and-sunrise` sekarang mengembalikan 404, sama seperti live.

## Catatan Implementasi

Renderer sekarang membersihkan output lama di:

- `5-experience-engine/public-website/pages`
- `5-experience-engine/json-ld/pages`

Ini penting agar route yang sudah dihapus dari source tidak meninggalkan stale output yang masih bisa dikonsumsi website.
