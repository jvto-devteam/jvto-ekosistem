# CMS Render and Deploy Automation

Tanggal implementasi: 2026-08-12

## Tujuan

Menghilangkan langkah manual setelah konten diedit di Tina CMS.

Sebelumnya, setelah edit file source CMS, operator perlu menjalankan:

```bash
npm run render:web-content
```

Sekarang ada dua jalur otomatis:

- watcher lokal untuk development/editing harian;
- TinaCloud/Git-backed CMS untuk save -> commit ke GitHub;
- GitHub Actions untuk validate-render-build-deploy ke VPS.

## Jalur Production yang Diinginkan

Alur production:

```text
Editor membuka /admin
-> login TinaCloud
-> edit dan save konten
-> TinaCloud membuat commit ke GitHub branch main
-> push ke main men-trigger GitHub Actions
-> GitHub Actions audit + render + build admin
-> deploy ke VPS
-> PM2 restart/reload
```

Jadi render output dan deploy tidak dijalankan langsung dari tombol Save di VPS. Trigger production yang aman adalah commit/push dari TinaCloud ke GitHub.

## Jalur Lokal

Gunakan command ini saat bekerja lokal dengan Tina CMS:

```bash
npm run cms:dev:auto
```

Command tersebut menjalankan dua proses bersamaan:

- `npm run cms:dev`
- `npm run watch:web-content`

Watcher memantau:

- `1-knowledge-and-evidence-core/travel-guide/**/*.source.json`
- `1-knowledge-and-evidence-core/why-jvto/**/*.source.json`
- `1-knowledge-and-evidence-core/policies/**/*.source.json`

Ketika source berubah, watcher otomatis menjalankan:

```bash
npm run render:web-content
```

Script watcher memakai debounce agar satu save dari Tina yang memicu beberapa event file tetap hanya menjalankan render sekali.

## Jalur CI/CD

Workflow GitHub Actions:

```text
.github/workflows/deploy-vps.yml
```

Trigger:

- push ke branch `main`;
- manual run lewat `workflow_dispatch`.

Urutan kerja:

1. Checkout repo.
2. Install dependency dengan `npm ci`.
3. Audit Tina CMS content:
   ```bash
   npm run cms:audit -- --verbose
   ```
4. Render output website:
   ```bash
   npm run render:web-content
   ```
5. Build Tina admin:
   ```bash
   npm run cms:build
   ```
   Jika secrets TinaCloud tersedia, build admin memakai mode Git-backed/TinaCloud. Jika tidak tersedia, build fallback ke mode lokal.
6. Validasi route count live-aligned = `34`.
7. Sync file ke VPS:
   ```text
   /var/www/jvto-ekosistem
   ```
8. Install production dependency di VPS.
9. Restart atau start PM2 app:
   ```text
   jvto-ekosistem
   ```

## GitHub Secrets yang Dibutuhkan

Tambahkan secrets berikut di GitHub repository settings:

```text
VPS_HOST
VPS_USER
VPS_SSH_KEY
VPS_PORT
NEXT_PUBLIC_TINA_CLIENT_ID
TINA_TOKEN
```

Keterangan:

- `VPS_HOST`: IP atau hostname VPS.
- `VPS_USER`: user SSH, misalnya `root`. Jika kosong, workflow memakai `root`.
- `VPS_SSH_KEY`: private key SSH yang punya akses deploy ke VPS.
- `VPS_PORT`: port SSH. Jika kosong, workflow memakai `22`.
- `NEXT_PUBLIC_TINA_CLIENT_ID`: TinaCloud Client ID project ini.
- `TINA_TOKEN`: TinaCloud read-only token untuk build/indexing.

Tambahkan juga branch production di TinaCloud project sebagai `main`, dan hubungkan TinaCloud ke repository GitHub yang sama. Setelah itu Save di TinaCloud dapat menghasilkan commit ke GitHub.

## File yang Tidak Dikirim ke VPS

Workflow mengecualikan:

- `.git/`
- `.github/`
- `node_modules/`
- `.env`
- `.env.*`
- `public/uploads/`

`public/admin/` tetap dikirim karena workflow menjalankan `npm run cms:build` sebelum deploy.

## Build Mode

Script `npm run cms:build` memakai wrapper:

```text
scripts/build-tina-admin.mjs
```

Perilaku:

- Jika `NEXT_PUBLIC_TINA_CLIENT_ID` dan `TINA_TOKEN` ada, build memakai TinaCloud/Git-backed mode.
- Jika credential tidak ada, build memakai local mode:
  ```bash
  tinacms build --local --skip-cloud-checks
  ```

Ini membuat development lokal tetap bisa jalan tanpa credential, sementara production bisa memakai Git-backed CMS.

## Catatan Penting

- Source yang diedit manusia/CMS adalah `*.source.json`.
- Output di `5-experience-engine/**` adalah hasil render dan tidak perlu diedit manual.
- Renderer sudah membersihkan stale output lama sebelum generate ulang.
- CI/CD akan gagal jika route count bukan `34`, karena saat ini cluster Travel Guide, Policy, dan Why JVTO sudah disamakan dengan live sitemap.
- Save online via TinaCloud baru akan auto-deploy kalau TinaCloud project sudah terhubung ke GitHub repo dan punya izin commit ke branch production.

## Command Ringkas

Development lokal:

```bash
npm run cms:dev:auto
```

Render manual bila perlu:

```bash
npm run render:web-content
```

Validasi manual:

```bash
npm run cms:audit -- --verbose
```

Build admin manual:

```bash
npm run cms:build
```
