# Arsip — dua file hasil ekstraksi terbalik

Dipindahkan ke sini 2026-08-30.

Kedua file membawa `source.repo = /Users/macbook/Code/jvto-web`, `commit 75a21d11`,
`generatedAt 2026-08-11` — yaitu snapshot yang diekstrak DARI consumer (`jvto-web`)
ke dalam SSOT. Arah authority terbalik terhadap keputusan terkunci
(`jvto-ekosistem` = SSOT, `jvto-web` = consumer), dan isinya 19 hari lebih tua
dari HEAD saat pemindahan.

Digantikan oleh:
- inventaris route  -> `5-experience-engine/manifests/route-output-index.json`
- kontrak per-route -> `5-experience-engine/manifests/rendered-graph-contract.json`

Pembaca yang tersisa: `scripts/migrate-web-content-to-source.mjs` membaca
`page-metadata-index.json` lewat `readJsonIfExists()` — migrasi sudah selesai dan
fungsi itu mengembalikan null tanpa error bila file tidak ada.

Undo: `git mv` kembali ke path asal, atau `git checkout <sha> -- <path>`.
