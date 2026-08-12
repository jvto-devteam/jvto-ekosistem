# Readiness Audit

Tanggal pemeriksaan: 2026-08-12

## Scope

Audit ini memeriksa kesiapan current state `jvto-ekosistem` setelah setup:

- source/output website untuk Travel Guide, Policy, dan Why JVTO;
- API render untuk website;
- Tina CMS;
- watcher lokal;
- GitHub Actions deploy ke VPS;
- duplikasi/stale output.

## Ringkasan Hasil

Status: siap secara struktur dan pipeline lokal.

Syarat eksternal yang masih harus dipenuhi sebelum production online:

- GitHub Secrets harus diisi:
  - `NEXT_PUBLIC_TINA_CLIENT_ID`
  - `TINA_TOKEN`
  - `VPS_HOST`
  - `VPS_USER`
  - `VPS_SSH_KEY`
  - `VPS_PORT`
- TinaCloud project harus terhubung ke GitHub repo ini dan production branch `main`.

## Source dan Route

Source aktif:

- Travel Guide: 13
- Policy: 4
- Why JVTO: 17
- Total: 34

Hasil pemeriksaan:

```json
{
  "sourceCount": 34,
  "indexCount": 34,
  "mapCount": 34,
  "feedCount": 34,
  "errors": []
}
```

Route source dibandingkan dengan sitemap live:

```json
{
  "liveCount": 34,
  "repoCount": 34,
  "missingInRepo": [],
  "extraInRepo": []
}
```

## Duplikasi dan Stale Output

Hasil pemeriksaan:

- Tidak ada duplicate route.
- Tidak ada duplicate `domain + slug`.
- Tidak ada exact duplicate hash untuk file aktif source/output.
- Output lama untuk route Travel Guide yang live 404 sudah hilang.

Renderer juga sudah membersihkan folder output lama sebelum generate:

- `5-experience-engine/public-website/pages`
- `5-experience-engine/json-ld/pages`

## API Render Website

Server test: `PORT=4199 npm run start`

Endpoint yang lolos:

- `GET /health` -> 200
- `GET /api/website/routes` -> 34 routes
- `GET /api/website/page?route=/travel-guide/packing-list` -> 200
- `GET /api/website/page?route=/policy/privacy` -> 200
- `GET /api/website/page?route=/why-jvto/our-team/anjas` -> 200
- `GET /api/website/page?route=/why-jvto/reviews` -> 200
- `GET /api/website/page?route=/travel-guide/blue-fire-and-sunrise` -> 404
- `GET /api/website/page?route=travel-guide` -> 400

Crew privacy check:

- `/why-jvto/our-team/anjas` memiliki 5 featured reviews.
- Field `phone` tidak bocor ke payload crew detail.

## Tina CMS

Validasi:

```bash
npm run cms:audit -- --verbose
npm run cms:build
```

Hasil:

- Tina membaca 13 Travel Guide documents.
- Tina membaca 17 Why JVTO documents.
- Tina membaca 4 Policy documents.
- Build admin berhasil menghasilkan `public/admin/index.html`.
- `GET /admin/index.html` dari `server.mjs` mengembalikan `200 text/html`.

Config Tina:

- Local fallback tetap tersedia tanpa TinaCloud credentials.
- Production Git-backed build memakai:
  - `NEXT_PUBLIC_TINA_CLIENT_ID`
  - `TINA_TOKEN`
  - `NEXT_PUBLIC_TINA_BRANCH`

## Watcher Lokal

Command:

```bash
npm run cms:dev:auto
```

Hasil test:

- Tina dev server aktif.
- Web server aktif.
- Watcher aktif.
- Initial render menghasilkan 34 outputs.
- Tidak ada proses/port yang tertinggal setelah dihentikan.

## GitHub Actions

Workflow:

```text
.github/workflows/deploy-vps.yml
```

Trigger:

- push ke `main`
- `workflow_dispatch`

Validasi yang dilakukan:

- YAML parse berhasil.
- Workflow mengandung step:
  - `npm ci`
  - `npm run cms:audit -- --verbose`
  - `npm run render:web-content`
  - validasi TinaCloud secrets
  - `npm run cms:build`
  - route count check = 34
  - rsync deploy ke VPS
  - `npm ci --omit=dev` di VPS
  - PM2 reload/start

Catatan penting:

- Workflow sekarang fail-fast jika `NEXT_PUBLIC_TINA_CLIENT_ID` atau `TINA_TOKEN` kosong, supaya production tidak diam-diam deploy admin local-mode.
- Workflow juga fail-fast jika `VPS_SSH_KEY` atau `VPS_HOST` kosong.

## Install/Lockfile

Validasi:

```bash
npm ci --dry-run
```

Hasil: berhasil.

Catatan: `npm audit` masih melaporkan 19 vulnerabilities dari dependency tree Tina/dev tooling. Belum dijalankan `npm audit fix` karena itu bisa mengubah dependency besar dan perlu keputusan terpisah.

## Kesimpulan

Secara file, render API, Tina, watcher, dan GitHub Actions, state saat ini sudah rapi untuk alur:

```text
Save di TinaCloud
-> commit/push ke GitHub main
-> GitHub Actions audit + render + build
-> deploy ke VPS
-> PM2 reload
```

Yang belum bisa diverifikasi dari lokal adalah benar-benar sukses login/save TinaCloud dan SSH deploy ke VPS, karena itu bergantung pada secrets dan koneksi akun eksternal.
