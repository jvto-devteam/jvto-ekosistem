# Booking Sync Core Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Layer-1 sync engine that fetches `booking-overview` and `customer-portal-detail` from the JVTO backoffice, diffs against the last known state, and writes the result into `archive/`, wired to a GitHub Actions workflow that runs on a `repository_dispatch` event (or a 6-hour fallback schedule) and commits directly to `main` when there's a real change.

**Architecture:** Three small ESM modules (`manifest.mjs` for hashing/diffing, `fetch.mjs` for the two HTTP calls, `sync-booking-data.mjs` as the orchestrator with dependency-injected fetchers for testability) plus one new GitHub Actions workflow and a one-line addition to the existing deploy workflow so booking-data commits don't trigger a VPS deploy.

**Tech Stack:** Node.js (ESM, `.mjs`), `node:assert/strict` for tests (matches `scripts/test/schema-contract.test.mjs` — no test framework in this repo), `node:crypto` for hashing, native `fetch`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-19-booking-data-sync-pipeline-design.md`

## Global Constraints

- Node >= 18 (per `package.json` `engines`), ESM `.mjs` files, no TypeScript.
- No test framework — plain `node:assert/strict` scripts run directly with `node`, following `scripts/test/schema-contract.test.mjs`'s pattern (blocks of `{ ... }` per case, `console.log("<file>: all assertions passed")` at the end).
- Do not add new npm dependencies. `js-yaml` is already available transitively (used for YAML-validation steps in this plan) — do not add it to `package.json`.
- Endpoints (exact, no auth needed — verified reachable directly):
  - `https://new-backoffice.javavolcano-touroperator.com/booking-overview/api?json=true&filter_type=month&month={YYYY-MM}`
  - `https://legacy.javavolcano-touroperator.com/bookings/details/{slug}?json=true`
- Archive paths (exact):
  - `archive/booking-overview-snapshot/booking-overview.raw.json`
  - `archive/booking-overview-snapshot/headers.txt`
  - `archive/booking-overview-snapshot/sync-manifest.json` (new)
  - `archive/booking-overview-snapshot/sync-report.json` (new)
  - `archive/customer-portal-detail-snapshot/details/{slug}.raw.json`
  - `archive/customer-portal-detail-snapshot/fetch-manifest.json`
- Commit strategy: direct commit + push to `main` from the workflow (no PR), only when `git status --porcelain` shows a real diff.
- Workflow concurrency group: `booking-sync` (queues overlapping runs, never runs them in parallel).
- Fallback schedule: cron `0 */6 * * *` (every 6 hours), in addition to `repository_dispatch` and `workflow_dispatch`.
- This plan covers `jvto-ekosistem` only. The Laravel-side trigger (`repository_dispatch` caller) and the 29 derived-file generators are out of scope — separate plans.

---

### Task 1: `manifest.mjs` — hashing and diff logic

**Files:**
- Create: `scripts/lib/booking-sync/manifest.mjs`
- Test: `scripts/test/booking-sync/manifest.test.mjs`

**Interfaces:**
- Produces:
  - `hashBookingRecord(record: object): string` — deterministic sha256 hex digest, independent of key order.
  - `extractSlug(customerPortalUrl: string | null | undefined): string | null` — last path segment of the `customer_portal` URL, or `null`.
  - `diffManifest(previousManifest: Record<string, {hash: string, slug: string|null}>, currentRecords: object[]): {added: string[], removed: string[], updated: string[], unchanged: string[], manifest: Record<string, {hash: string, slug: string|null}>}` — `currentRecords` are raw booking-overview records (must have `.booking_id` and `.customer_portal`); returned arrays hold `booking_id` values as strings.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/booking-sync/manifest.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { hashBookingRecord, diffManifest, extractSlug } from "../../lib/booking-sync/manifest.mjs";

{
  const a = { booking_id: 1, guest: "A", date: { start: "x", end: "y" } };
  const b = { date: { end: "y", start: "x" }, guest: "A", booking_id: 1 };
  assert.equal(hashBookingRecord(a), hashBookingRecord(b));
}

{
  const a = { booking_id: 1, guest: "A" };
  const b = { booking_id: 1, guest: "B" };
  assert.notEqual(hashBookingRecord(a), hashBookingRecord(b));
}

{
  assert.equal(extractSlug("https://x/my-booking/abc123"), "abc123");
  assert.equal(extractSlug("https://x/my-booking/abc123/"), "abc123");
  assert.equal(extractSlug(null), null);
  assert.equal(extractSlug(undefined), null);
}

{
  const recordOne = { booking_id: 1, guest: "A", customer_portal: "https://x/my-booking/slug-1" };
  const recordTwoOld = { booking_id: 2, guest: "B", customer_portal: "https://x/my-booking/slug-2" };
  const previous = {
    "1": { hash: hashBookingRecord(recordOne), slug: "slug-1" },
    "2": { hash: hashBookingRecord(recordTwoOld), slug: "slug-2" },
  };
  const current = [
    recordOne,
    { booking_id: 2, guest: "B-changed", customer_portal: "https://x/my-booking/slug-2" },
    { booking_id: 3, guest: "C", customer_portal: "https://x/my-booking/slug-3" },
  ];
  const diff = diffManifest(previous, current);
  assert.deepEqual(diff.added, ["3"]);
  assert.deepEqual(diff.updated, ["2"]);
  assert.deepEqual(diff.unchanged, ["1"]);
  assert.deepEqual(diff.removed, []);
  assert.equal(diff.manifest["3"].slug, "slug-3");
  assert.equal(diff.manifest["1"].hash, previous["1"].hash);
}

{
  const previous = { "9": { hash: "whatever", slug: "slug-9" } };
  const diff = diffManifest(previous, []);
  assert.deepEqual(diff.removed, ["9"]);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.manifest, {});
}

console.log("manifest.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test/booking-sync/manifest.test.mjs`
Expected: FAIL — `Cannot find module '../../lib/booking-sync/manifest.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/booking-sync/manifest.mjs`:

```javascript
import { createHash } from "node:crypto";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function hashBookingRecord(record) {
  const canonical = JSON.stringify(canonicalize(record));
  return createHash("sha256").update(canonical).digest("hex");
}

export function extractSlug(customerPortalUrl) {
  if (!customerPortalUrl) return null;
  const parts = customerPortalUrl.split("/").filter(Boolean);
  return parts.at(-1) ?? null;
}

export function diffManifest(previousManifest, currentRecords) {
  const added = [];
  const updated = [];
  const unchanged = [];
  const nextManifest = {};
  const seenIds = new Set();

  for (const record of currentRecords) {
    const bookingId = String(record.booking_id);
    seenIds.add(bookingId);
    const hash = hashBookingRecord(record);
    const slug = extractSlug(record.customer_portal);
    nextManifest[bookingId] = { hash, slug };

    const previous = previousManifest[bookingId];
    if (!previous) {
      added.push(bookingId);
    } else if (previous.hash !== hash) {
      updated.push(bookingId);
    } else {
      unchanged.push(bookingId);
    }
  }

  const removed = Object.keys(previousManifest).filter((id) => !seenIds.has(id));

  return { added, removed, updated, unchanged, manifest: nextManifest };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test/booking-sync/manifest.test.mjs`
Expected: PASS — prints `manifest.test.mjs: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/booking-sync/manifest.mjs scripts/test/booking-sync/manifest.test.mjs
git commit -m "feat(booking-sync): add manifest hashing and diff logic"
```

---

### Task 2: `fetch.mjs` — booking-overview and customer-portal-detail fetchers

**Files:**
- Create: `scripts/lib/booking-sync/fetch.mjs`
- Test: `scripts/test/booking-sync/fetch.test.mjs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `fetchBookingOverviewMonth(month: string, opts?: {fetchImpl?: typeof fetch}): Promise<{records: object[], headers: string}>` — `month` is `"YYYY-MM"`. Throws on non-2xx response with a message containing the HTTP status.
  - `fetchCustomerPortalDetail(slug: string, opts?: {fetchImpl?: typeof fetch}): Promise<{slug: string, url: string, statusCode: number, ok: boolean, error: string|null, json: object|null}>`.
  - Both accept an injectable `fetchImpl` (defaults to global `fetch`) so tests never hit the network.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/booking-sync/fetch.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { fetchBookingOverviewMonth, fetchCustomerPortalDetail } from "../../lib/booking-sync/fetch.mjs";

function fakeResponse({ ok = true, status = 200, statusText = "OK", headers = {}, body = {} } = {}) {
  return {
    ok,
    status,
    statusText,
    headers: { entries: () => Object.entries(headers) },
    json: async () => body,
  };
}

{
  let capturedUrl = null;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return fakeResponse({ headers: { "content-type": "application/json" }, body: [{ booking_id: 1 }] });
  };
  const result = await fetchBookingOverviewMonth("2026-08", { fetchImpl });
  assert.equal(
    capturedUrl,
    "https://new-backoffice.javavolcano-touroperator.com/booking-overview/api?json=true&filter_type=month&month=2026-08"
  );
  assert.deepEqual(result.records, [{ booking_id: 1 }]);
  assert.equal(result.headers, "content-type: application/json");
}

{
  const fetchImpl = async () => fakeResponse({ ok: false, status: 500, statusText: "Server Error" });
  await assert.rejects(() => fetchBookingOverviewMonth("2026-08", { fetchImpl }), /500/);
}

{
  let capturedUrl = null;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return fakeResponse({ body: { success: true, booking: { booking_id: 1 } } });
  };
  const result = await fetchCustomerPortalDetail("abc123", { fetchImpl });
  assert.equal(capturedUrl, "https://legacy.javavolcano-touroperator.com/bookings/details/abc123?json=true");
  assert.equal(result.slug, "abc123");
  assert.equal(result.ok, true);
  assert.equal(result.statusCode, 200);
  assert.equal(result.error, null);
  assert.deepEqual(result.json, { success: true, booking: { booking_id: 1 } });
}

{
  const fetchImpl = async () => fakeResponse({ ok: false, status: 404, statusText: "Not Found", body: null });
  const result = await fetchCustomerPortalDetail("missing-slug", { fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 404);
  assert.equal(result.slug, "missing-slug");
}

console.log("fetch.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test/booking-sync/fetch.test.mjs`
Expected: FAIL — `Cannot find module '../../lib/booking-sync/fetch.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/booking-sync/fetch.mjs`:

```javascript
const BOOKING_OVERVIEW_BASE = "https://new-backoffice.javavolcano-touroperator.com/booking-overview/api";
const CUSTOMER_PORTAL_DETAIL_BASE = "https://legacy.javavolcano-touroperator.com/bookings/details";

export async function fetchBookingOverviewMonth(month, { fetchImpl = fetch } = {}) {
  const url = `${BOOKING_OVERVIEW_BASE}?json=true&filter_type=month&month=${month}`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`fetchBookingOverviewMonth: ${response.status} ${response.statusText} for month=${month}`);
  }
  const records = await response.json();
  const headers = [...response.headers.entries()].map(([key, value]) => `${key}: ${value}`).join("\n");
  return { records, headers };
}

export async function fetchCustomerPortalDetail(slug, { fetchImpl = fetch } = {}) {
  const url = `${CUSTOMER_PORTAL_DETAIL_BASE}/${slug}?json=true`;
  const response = await fetchImpl(url);
  let json = null;
  let error = null;
  try {
    json = await response.json();
  } catch (err) {
    error = err.message;
  }
  return { slug, url, statusCode: response.status, ok: response.ok, error, json };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test/booking-sync/fetch.test.mjs`
Expected: PASS — prints `fetch.test.mjs: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/booking-sync/fetch.mjs scripts/test/booking-sync/fetch.test.mjs
git commit -m "feat(booking-sync): add booking-overview and customer-portal-detail fetchers"
```

---

### Task 3: `sync-booking-data.mjs` — orchestrator + `package.json` scripts

**Files:**
- Create: `scripts/sync-booking-data.mjs`
- Test: `scripts/test/booking-sync/sync-booking-data.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `hashBookingRecord`/`diffManifest` from Task 1 (`scripts/lib/booking-sync/manifest.mjs`), `fetchBookingOverviewMonth`/`fetchCustomerPortalDetail` from Task 2 (`scripts/lib/booking-sync/fetch.mjs`).
- Produces: `runSync(opts?: {dryRun?: boolean, now?: Date, archiveRoot?: string, fetchBookingOverviewMonth?: fn, fetchCustomerPortalDetail?: fn}): Promise<{diff, report, detailResults}>`, plus a CLI entrypoint (`node scripts/sync-booking-data.mjs [--dry-run]`) that later tasks (the workflow) invoke via `npm run sync:booking`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/booking-sync/sync-booking-data.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runSync } from "../../sync-booking-data.mjs";

async function withTempRoot(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "booking-sync-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function stubDetail(slug) {
  return {
    slug,
    url: `https://legacy.javavolcano-touroperator.com/bookings/details/${slug}?json=true`,
    statusCode: 200,
    ok: true,
    error: null,
    json: { success: true, booking: { slug } },
  };
}

{
  await withTempRoot(async (archiveRoot) => {
    const stubOverview = async (month) =>
      month === "2026-08"
        ? {
            records: [
              { booking_id: 1, customer_portal: "https://x/my-booking/slug-1" },
              { booking_id: 2, customer_portal: "https://x/my-booking/slug-2" },
            ],
            headers: "content-type: application/json",
          }
        : { records: [], headers: "content-type: application/json" };

    const result = await runSync({
      now: new Date("2026-08-15T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: stubOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    assert.deepEqual(result.diff.added, ["1", "2"]);

    const overview = JSON.parse(
      await readFile(path.join(archiveRoot, "archive/booking-overview-snapshot/booking-overview.raw.json"), "utf8")
    );
    assert.equal(overview.length, 2);

    const detail1 = JSON.parse(
      await readFile(path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details/slug-1.raw.json"), "utf8")
    );
    assert.equal(detail1.json.booking.slug, "slug-1");

    const manifest = JSON.parse(
      await readFile(path.join(archiveRoot, "archive/booking-overview-snapshot/sync-manifest.json"), "utf8")
    );
    assert.ok(manifest["1"].hash);
    assert.equal(manifest["1"].slug, "slug-1");

    const portalManifest = JSON.parse(
      await readFile(path.join(archiveRoot, "archive/customer-portal-detail-snapshot/fetch-manifest.json"), "utf8")
    );
    assert.equal(portalManifest.results.length, 2);
  });
}

{
  await withTempRoot(async (archiveRoot) => {
    const firstOverview = async (month) =>
      month === "2026-08"
        ? {
            records: [
              { booking_id: 1, customer_portal: "https://x/my-booking/slug-1" },
              { booking_id: 2, customer_portal: "https://x/my-booking/slug-2" },
            ],
            headers: "content-type: application/json",
          }
        : { records: [], headers: "content-type: application/json" };

    await runSync({
      now: new Date("2026-08-15T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: firstOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    const secondOverview = async (month) =>
      month === "2026-08"
        ? { records: [{ booking_id: 1, customer_portal: "https://x/my-booking/slug-1" }], headers: "content-type: application/json" }
        : { records: [], headers: "content-type: application/json" };

    const result = await runSync({
      now: new Date("2026-08-16T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: secondOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    assert.deepEqual(result.diff.removed, ["2"]);
    assert.deepEqual(result.diff.unchanged, ["1"]);

    await assert.rejects(() =>
      readFile(path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details/slug-2.raw.json"), "utf8")
    );
    const detail1Still = await readFile(
      path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details/slug-1.raw.json"),
      "utf8"
    );
    assert.ok(detail1Still.includes("slug-1"));
  });
}

{
  await withTempRoot(async (archiveRoot) => {
    const stubOverview = async (month) =>
      month === "2026-08"
        ? { records: [{ booking_id: 1, customer_portal: "https://x/my-booking/slug-1" }], headers: "h" }
        : { records: [], headers: "h" };

    await runSync({
      dryRun: true,
      now: new Date("2026-08-15T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: stubOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    await assert.rejects(() =>
      readFile(path.join(archiveRoot, "archive/booking-overview-snapshot/booking-overview.raw.json"), "utf8")
    );
  });
}

console.log("sync-booking-data.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test/booking-sync/sync-booking-data.test.mjs`
Expected: FAIL — `Cannot find module '../../sync-booking-data.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/sync-booking-data.mjs`:

```javascript
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  fetchBookingOverviewMonth as defaultFetchBookingOverviewMonth,
  fetchCustomerPortalDetail as defaultFetchCustomerPortalDetail,
} from "./lib/booking-sync/fetch.mjs";
import { diffManifest } from "./lib/booking-sync/manifest.mjs";

function currentAndNextMonth(now) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const format = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
  const current = format(year, month);
  const nextDate = new Date(Date.UTC(year, month + 1, 1));
  const next = format(nextDate.getUTCFullYear(), nextDate.getUTCMonth());
  return [current, next];
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

export async function runSync({
  dryRun = false,
  now = new Date(),
  archiveRoot = process.cwd(),
  fetchBookingOverviewMonth = defaultFetchBookingOverviewMonth,
  fetchCustomerPortalDetail = defaultFetchCustomerPortalDetail,
} = {}) {
  const overviewDir = path.join(archiveRoot, "archive/booking-overview-snapshot");
  const portalDir = path.join(archiveRoot, "archive/customer-portal-detail-snapshot");
  const portalDetailsDir = path.join(portalDir, "details");

  const [currentMonth, nextMonth] = currentAndNextMonth(now);

  const [currentResult, nextResult] = await Promise.all([
    fetchBookingOverviewMonth(currentMonth),
    fetchBookingOverviewMonth(nextMonth),
  ]);

  const merged = new Map();
  for (const record of [...currentResult.records, ...nextResult.records]) {
    merged.set(record.booking_id, record);
  }
  const records = [...merged.values()].sort((a, b) => a.booking_id - b.booking_id);

  const previousManifest = await readJsonIfExists(path.join(overviewDir, "sync-manifest.json"), {});
  const previousPortalManifest = await readJsonIfExists(path.join(portalDir, "fetch-manifest.json"), { results: [] });
  const previousBySlug = new Map(previousPortalManifest.results.map((r) => [r.slug, r]));

  const diff = diffManifest(previousManifest, records);

  const detailResults = [];
  for (const bookingId of [...diff.added, ...diff.updated]) {
    const slug = diff.manifest[bookingId].slug;
    if (!slug) continue;
    detailResults.push(await fetchCustomerPortalDetail(slug));
  }

  const report = {
    generatedAt: now.toISOString(),
    months: [currentMonth, nextMonth],
    added: diff.added,
    removed: diff.removed,
    updated: diff.updated,
    unchangedCount: diff.unchanged.length,
  };

  if (dryRun) {
    return { diff, report, detailResults };
  }

  await mkdir(overviewDir, { recursive: true });
  await mkdir(portalDetailsDir, { recursive: true });

  await writeFile(path.join(overviewDir, "booking-overview.raw.json"), JSON.stringify(records, null, 2) + "\n");
  await writeFile(path.join(overviewDir, "headers.txt"), currentResult.headers + "\n");
  await writeFile(path.join(overviewDir, "sync-manifest.json"), JSON.stringify(diff.manifest, null, 2) + "\n");
  await writeFile(path.join(overviewDir, "sync-report.json"), JSON.stringify(report, null, 2) + "\n");

  for (const detail of detailResults) {
    await writeFile(
      path.join(portalDetailsDir, `${detail.slug}.raw.json`),
      JSON.stringify({ slug: detail.slug, url: detail.url, statusCode: detail.statusCode, ok: detail.ok, json: detail.json }, null, 2) + "\n"
    );
  }

  for (const bookingId of diff.removed) {
    const slug = previousManifest[bookingId]?.slug;
    if (slug) {
      await rm(path.join(portalDetailsDir, `${slug}.raw.json`), { force: true });
    }
  }

  const manifestEntries = [...diff.added, ...diff.updated, ...diff.unchanged].map((bookingId) => {
    const slug = diff.manifest[bookingId].slug;
    const fresh = detailResults.find((d) => d.slug === slug);
    if (fresh) {
      return { slug: fresh.slug, url: fresh.url, statusCode: fresh.statusCode, ok: fresh.ok, error: fresh.error };
    }
    return (
      previousBySlug.get(slug) ?? {
        slug,
        url: `https://legacy.javavolcano-touroperator.com/bookings/details/${slug}?json=true`,
        statusCode: null,
        ok: null,
        error: "not-refetched",
      }
    );
  });
  await writeFile(
    path.join(portalDir, "fetch-manifest.json"),
    JSON.stringify({ generatedAt: now.toISOString(), requested: manifestEntries.length, results: manifestEntries }, null, 2) + "\n"
  );

  return { diff, report, detailResults };
}

const isMainModule = path.resolve(process.argv[1] ?? "") === path.resolve(new URL(import.meta.url).pathname);
if (isMainModule) {
  const dryRun = process.argv.includes("--dry-run");
  const result = await runSync({ dryRun });
  console.log(JSON.stringify(result.report, null, 2));
  if (dryRun) {
    console.log(`[dry-run] would fetch/keep ${result.detailResults.length} customer-portal detail(s); no files written.`);
  }
}
```

Modify `package.json` — add two entries inside `"scripts"` (after `"validate:schema"`):

```json
    "sync:booking": "node scripts/sync-booking-data.mjs",
    "sync:booking:dry-run": "node scripts/sync-booking-data.mjs --dry-run",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test/booking-sync/sync-booking-data.test.mjs`
Expected: PASS — prints `sync-booking-data.test.mjs: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-booking-data.mjs scripts/test/booking-sync/sync-booking-data.test.mjs package.json
git commit -m "feat(booking-sync): add sync orchestrator and npm scripts"
```

---

### Task 4: `sync-booking-data.yml` — GitHub Actions workflow

**Files:**
- Create: `.github/workflows/sync-booking-data.yml`

**Interfaces:**
- Consumes: `npm run sync:booking` from Task 3.
- Produces: nothing consumed by later tasks in this plan.

- [ ] **Step 1: Write the workflow file**

Create `.github/workflows/sync-booking-data.yml`:

```yaml
name: Sync Booking Data

on:
  repository_dispatch:
    types: [booking-changed]
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

concurrency:
  group: booking-sync
  cancel-in-progress: false

jobs:
  sync:
    name: Fetch, diff, and commit booking data
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run booking sync
        run: npm run sync:booking

      - name: Commit and push if changed
        run: |
          set -euo pipefail
          git config user.name "jvto-ekosistem-bot"
          git config user.email "actions@users.noreply.github.com"
          if git status --porcelain | grep -q .; then
            git add archive/booking-overview-snapshot archive/customer-portal-detail-snapshot
            git commit -m "chore(booking-sync): sync booking data $(date -u +%Y-%m-%dT%H:%M:%SZ)"
            git push
          else
            echo "No changes to commit."
          fi
```

- [ ] **Step 2: Validate YAML syntax**

Run:
```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/sync-booking-data.yml', 'utf8')); console.log('YAML OK')"
```
Expected: prints `YAML OK` with no error.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync-booking-data.yml
git commit -m "feat(booking-sync): add GitHub Actions sync workflow"
```

---

### Task 5: `deploy-vps.yml` — exclude booking-sync paths from triggering a full deploy

**Files:**
- Modify: `.github/workflows/deploy-vps.yml` (the `on:` block near the top of the file)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Make the change**

In `.github/workflows/deploy-vps.yml`, find:

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

Replace with:

```yaml
on:
  push:
    branches:
      - main
    paths-ignore:
      - 'archive/booking-overview-snapshot/**'
      - 'archive/customer-portal-detail-snapshot/**'
      - '3-booking-and-journey-core/**'
      - '4-operations-core/**'
  workflow_dispatch:
```

(`3-booking-and-journey-core/**` and `4-operations-core/**` are included now even though this plan's `sync-booking-data.yml` only touches `archive/**` — the later plan that adds the 29 derived-file generators will write there, and this line is a one-time, low-risk addition to make now rather than a second edit to a production deploy workflow later.)

- [ ] **Step 2: Validate YAML syntax and confirm nothing else changed**

Run:
```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/deploy-vps.yml', 'utf8')); console.log('YAML OK')"
git diff .github/workflows/deploy-vps.yml
```
Expected: `YAML OK`, and the diff shows only the `paths-ignore` block added — no other lines touched.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-vps.yml
git commit -m "chore(deploy): skip VPS deploy for booking-sync-only changes"
```

---

### Task 6: End-to-end dry-run against the real backoffice

**Files:** none created or modified — verification only.

**Interfaces:** none.

- [ ] **Step 1: Run a real dry-run**

Run: `npm run sync:booking:dry-run`
Expected: exits 0, prints a JSON report (`added`/`removed`/`updated`/`unchangedCount`) and a `[dry-run]` line. Compare `added`/`updated` counts against what's plausible for the current month (should roughly match the 74-booking scale seen in the existing archive) — a report showing 0 records or an HTTP error means the endpoint shape changed since the spec was written and Task 2/3 need revisiting before wiring the workflow live.

- [ ] **Step 2: Run a real (non-dry-run) sync locally and inspect the diff**

Run: `npm run sync:booking`
Then: `git status --porcelain archive/booking-overview-snapshot archive/customer-portal-detail-snapshot` and `git diff --stat archive/booking-overview-snapshot/booking-overview.raw.json`
Expected: only the four `archive/booking-overview-snapshot/*` files and per-booking files under `archive/customer-portal-detail-snapshot/details/` changed; spot-check that `sync-report.json`'s `added`/`updated`/`removed` counts match what `git diff --stat` shows changed.

- [ ] **Step 3: Commit the refreshed archive as the first real sync**

```bash
git add archive/booking-overview-snapshot archive/customer-portal-detail-snapshot
git commit -m "chore(booking-sync): initial manual sync run"
```

- [ ] **Step 4: Revert this manual commit locally is not needed** — this commit is the intended first real data refresh (previous archive was from 2026-08-07). Leave it in place; do not push yet — flag to the user that this is ready to push alongside the rest of the branch.
