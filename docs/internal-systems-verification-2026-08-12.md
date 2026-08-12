# JVTO Internal Systems Verification - 2026-08-12

This document answers the limitation stated in `Downloads/JVTO_Operating_Ecosystem.md`: the earlier GPT response could not verify the database, internal tools, partner APIs, or VPS workflow. This audit checks the actual local repositories, reachable PostgreSQL migration database, live public/internal endpoints, and VPS runtime.

Sensitive values, raw customer details, API tokens, and payment secrets are intentionally excluded.

## Scope Checked

- `jvto-web` local repository and database connection.
- `javavolcano-touroperator` legacy Laravel repository.
- `new-backoffice` repository structure and migrations.
- Live JVTO package and backoffice API endpoints.
- VPS `31.97.223.43` Nginx, PM2, firewall, ports, git state, and recent `jvto-web` logs.

## Architecture Clarification From Owner

After the first audit pass, the owner clarified the current hosting split:

- The legacy project, `new-backoffice`, and the current operational MySQL database are on hosting.
- The VPS currently hosts the present website and the forward-looking PostgreSQL database design for migration from the hosting MySQL database.
- Therefore, the PostgreSQL database checked in this audit should be treated as a migration/target database and design evidence, not as the sole current operational database.
- The absence of Laravel `artisan` and `php artisan schedule:run` on the checked VPS is not itself an error, because the current legacy operational stack is not hosted there.

## Executive Result

The operating ecosystem concept is directionally correct, but several parts that were only assumed in the Markdown are now verifiably uneven:

- Product, public content, policy, booking, finance, logistics, crew, vehicle, WhatsApp log, and public review data exist in the checked repositories, live endpoints, and PostgreSQL migration database.
- Partner channels exist as data categories, but only KLOOK has a substantial booking footprint and a visible OCTO-style connector in the legacy Laravel code.
- The ideal workflow layer for inquiry, quotation, event log, communication log, and incident log is not yet present as first-class tables in the checked PostgreSQL migration database.
- The VPS is running website services, but it should not be treated as the full current operational backend. Its risks are website/runtime and migration-DB related: public PostgreSQL firewall exposure, high historical restart count for `jvto-web`, and a dirty production working tree.

## Database Verification

Checked via the `jvto-web` PostgreSQL database connection. Per owner clarification, this is the VPS-side migration/target database design, while the current operational legacy/new-backoffice database remains on hosting/MySQL.

### Database Shape

- Public tables: 119.
- Packages: 30 total.
- Published and not soft-deleted packages: 17.
- Soft-deleted packages: 13.
- Public package API currently returns 17 package records.
- `jvto-web main` snapshot previously imported into this ecosystem has 16 active public packages because package `86` was excluded in that generated snapshot.

### Core Data Counts

- Package prices: 185.
- Package includes: 307.
- Package excludes: 162.
- Package addons: 452.
- Destinations: 10.
- Activities: 18.
- Hotels: 28.
- Crew members: 21.
- Vehicle units: 11.
- Content pages: 84.
- FAQs: 106.
- Policy documents: 10.
- Narrative claims: 26.
- Assets: 241.

### Booking Data

- Bookings: 415.
- Booking codes present: 415.
- Order channel present: 415.
- Start date present: 415.
- End date present: 415.
- With package ID: 323.
- Without package ID: 92.

Channel distribution:

- KLOOK: 185 bookings.
- Java Volcano Tour Operator: 146 bookings.
- The Window Travel: 84 bookings.
- GetYourGuide and Viator exist as order channels, but no bookings were found in this checked database.

Package coverage by channel:

- KLOOK: 184 with package ID, 1 without package ID.
- JVTO direct: 139 with package ID, 7 without package ID.
- The Window Travel: 0 with package ID, 84 without package ID.

Status distribution:

- Booking status: 413 `CONFIRMED`, 2 `PENDING`.
- Payment status: 280 `UNPAID`, 91 `PAID`, 44 `PARTIALLY_PAID`.
- Trip status: 377 `COMPLETED`, 36 `PRE_TRIP`, 2 `IN_PROGRESS`.

Booking date coverage:

- Earliest booking creation: 2024-06-15 Asia/Jakarta equivalent.
- Latest booking creation: 2025-12-10 Asia/Jakarta equivalent.
- Earliest trip start: 2024-09-19 Asia/Jakarta equivalent.
- Latest trip start: 2025-12-31 Asia/Jakarta equivalent.

### Operational Booking Coverage

Distinct booking coverage:

- Logistics: 413 bookings.
- Finance: 413 bookings.
- Payment history: 129 bookings.
- Hotel assignments: 394 bookings.
- Hotel room assignments: 394 bookings.
- Crew assignments: 344 bookings.
- Vehicle assignments: 199 bookings.
- T-shirt data: 413 bookings.
- WhatsApp logs: 306 bookings.
- Booking review records: 0 bookings.

Interpretation: booking execution data is present in the PostgreSQL migration database and is useful for migration design. However, final operational truth should still be reconciled against the hosting MySQL/new-backoffice source before cutting over. Post-trip review collection is not yet represented in `booking_reviews` / `booking_review_crews` in the checked PostgreSQL schema even though public reviews exist.

### Review Data

- Reviews: 213 total.
- Google reviews: 148.
- Google reviews with media/photos: 56.
- Google reviews with original reference URL: 148.
- Earliest Google/public review date: 2018-02-05 Asia/Jakarta equivalent.
- Latest Google/public review date: 2026-08-11 Asia/Jakarta equivalent.

This is newer than the previously imported `jvto-web main` generated review snapshot. The ecosystem should continue treating the DB/Google sync output as the fresher review source, not the older generated JSON snapshot.

## Missing Ideal Workflow Tables

The initial operating ecosystem design implies a workflow layer with auditable events and lifecycle transitions. These ideal tables were not found in the checked PostgreSQL migration database:

- `event_log`
- `booking_events`
- `communications`
- `communication_logs`
- `inquiries`
- `quotations`
- `incidents`
- `incident_logs`

This does not mean the business has no workflow. It means the workflow is currently distributed across the hosting legacy/new-backoffice system, booking fields, Laravel code, WhatsApp logs, payment history, backoffice structures, and external tools rather than a single auditable lifecycle/event model in the PostgreSQL migration design.

## Live Endpoint Verification

Checked endpoints:

- Package list: `https://javavolcano-touroperator.com/api/packages/web`
  - Status: 200.
  - Returned array count: 17.
- Package detail: `https://javavolcano-touroperator.com/api/packages/web/details?slug=tours/from-surabaya/bromo-madakaripura-ijen-3d2n`
  - Status: 200.
  - The detail endpoint requires the full route-like slug, not only the final segment.
- Booking overview: `https://new-backoffice.javavolcano-touroperator.com/booking-overview/api?json=true`
  - Status: 200.
  - Returned array count during audit: 79.

## Partner API Verification

### KLOOK / OCTO

Verified in `javavolcano-touroperator`:

- KLOOK/OCTO-style routes exist under `/api/octo`.
- Auth middleware exists via bearer token.
- Supplier, product, availability, booking, confirm, and cancel controllers exist.
- Product controller is intentionally scoped to package IDs `82`, `83`, and `84`.
- Booking flow stores KLOOK-specific fields in the legacy Laravel booking model.

Risks/gaps:

- API responses still include `testMode: true`; production/certification intent needs confirmation.
- KLOOK ticket delivery URLs reference `/api/octo/pdf?booking=...`, but no matching route was found in the checked Laravel route files.
- Some supplier reference / delivery values appear hardcoded in the booking controller.
- `jvto-web` production logs show a failed proxy to `https://legacy.javavolcano-touroperator.com/api/octo/availability` with `ECONNRESET`, so the proxy/integration path needs a live health check.

### GetYourGuide and Viator

- Both exist as order channels in the database.
- No booking records were found for them in the checked database.
- No equivalent first-class connector was found in the audited code paths.

Interpretation: they are currently channel concepts/public trust signals, not verified active booking connectors in the checked system.

## Xendit / Payment Verification

Verified in legacy Laravel:

- Xendit invoice generation exists in checkout/payment flows.
- Xendit invoice success webhook exists at `/third-party/xendit/webhook/invoice/success`.
- Reminder payment command can create Xendit invoices and redirect customers back to `/my-booking/{url}`.
- The checked PostgreSQL migration database has 413 booking finance rows and 246 payment history rows.

Gap:

- Payment state exists, but a unified event ledger for payment lifecycle transitions was not found in the checked PostgreSQL migration database.

## WhatsApp / Automation Verification

Verified in legacy Laravel:

- Scheduled commands exist for trip information, trip media, crew reminders, payment reminders, Bali reminders, and Google review sync.
- `app/Console/Kernel.php` schedules these commands every minute.
- WhatsApp log data exists in the checked database: 306 booking-linked records.

VPS finding:

- On the checked VPS, root crontab was empty.
- No visible `schedule:run` / `artisan` cron or systemd timer was found in `/etc/cron*`, `/var/spool/cron`, or systemd keyword scans.
- No Laravel `artisan` path was found under `/var/www` on that VPS scan.

Interpretation after owner clarification: this is expected if legacy and `new-backoffice` run from hosting. The remaining task is not "install the Laravel scheduler on the VPS" by default. The correct task is to document the hosting scheduler location, command, frequency, and logs, then only add a VPS scheduler if/when legacy operations migrate there.

## VPS / Deployment Verification

Checked VPS: `31.97.223.43`.

### Runtime

- PM2 is running multiple JVTO services.
- `jvto-ekosistem` is online, zero restarts, proxied by Nginx to `127.0.0.1:4178`.
- `jvto-web` is online on PM2, cwd `/var/www/jvto-web`, branch `live`, latest commit `01a15d3a`.
- `jvto-web` has 2474 historical restarts.

### Nginx

Verified server names include:

- `javavolcano-touroperator.com` and `www.javavolcano-touroperator.com` to port `3000`.
- `dev.javavolcano-touroperator.com` to port `3002`.
- `ekosistem.javavolcano-touroperator.com` to `127.0.0.1:4178`.
- Other operational apps: CMS, assets, help, WABA, WA dashboard, WA inbox, chat, OKF, files.

### Firewall / Ports

UFW is active with default incoming deny, but allows several public ports, including:

- `80`, `443`, `22`.
- `3000`.
- `5432`.
- `8080`.
- several playground/internal app ports.

PostgreSQL is listening on `0.0.0.0:5432` and `[::]:5432`, and UFW allows `5432/tcp` from anywhere. Since this PostgreSQL instance is intended as the future migration target, it should still be protected before it becomes operationally critical.

Recommendation: restrict `5432/tcp` to trusted IPs/VPN or bind PostgreSQL to local/private interfaces unless public DB access is intentionally required and separately hardened.

### Production Working Tree

`/var/www/jvto-web` on the VPS is dirty:

- Generated Prisma files modified.
- Many untracked uploaded files under `public/uploads`.
- Additional Prisma engine files untracked.

Recommendation: separate runtime uploads/generated artifacts from the git working tree, or explicitly document what production-generated files are allowed to remain untracked.

### Recent Production Log Signals

Recent `jvto-web` logs include:

- Next Server Action mismatch errors after deployment.
- `NoFallbackError`.
- Next image failure caused by an upstream image resolving to `127.0.0.1`.
- Invalid image resource errors for some uploaded paths.
- OCTO availability proxy failure with `ECONNRESET`.
- Out log includes raw booking/customer-shaped payloads, which means production logs may contain personal data.

Recommendation: sanitize production logs and reduce raw object logging for booking/customer payloads.

## What This Changes From The Original Markdown

The original Markdown was correct to say that GPT could not verify live implementation. After this audit:

- PostgreSQL migration database existence and coverage are verified.
- VPS deployment shape is verified.
- KLOOK connector existence is verified.
- Xendit and WhatsApp automation code existence is verified.
- Missing first-class lifecycle/event/inquiry/quotation/incident tables in the PostgreSQL migration design are verified.
- VPS website/runtime and migration-DB risks are identified from actual runtime state.

## Recommended Next Actions

1. Treat hosting MySQL/new-backoffice as current operational truth until migration cutover is explicitly planned.
2. Decide whether package count should be 17 or 16 in the ecosystem source of truth, because PostgreSQL/live API and the previous `jvto-web main` snapshot currently differ.
3. Document where the legacy Laravel scheduler currently runs on hosting; only install/repair `php artisan schedule:run` on VPS if operations migrate there.
4. Restrict public PostgreSQL access or document the security model before the migration database becomes operationally critical.
5. Add a first-class lifecycle/event model for booking, inquiry, quotation, communication, payment, incident, and review-request transitions in the PostgreSQL migration design.
6. Verify KLOOK production readiness: `testMode`, `/api/octo/pdf` route, availability proxy stability, and hardcoded delivery/supplier values.
7. Sanitize `jvto-web` production logs so booking/customer payloads are not printed raw.
8. Clean or formalize the production git working tree policy for `/var/www/jvto-web`.
