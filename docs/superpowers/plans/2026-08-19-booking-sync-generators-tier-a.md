# Booking Sync Generators — Tier A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the generator harness (shared context loader + runner) and the 10 Tier A generators — the ones that read raw archive directly with no dependency on any other generator's output — turning them from manually-written 2026-08-07 snapshots into deterministic functions that regenerate from the live archive.

**Architecture:** One pure function per output file (`scripts/lib/booking-sync/generators/*.mjs`), a shared `loadGeneratorContext()` that reads both raw archive sources once, and a `scripts/run-generators.mjs` orchestrator that runs registered generators in order and writes their JSON output. This plan registers only the 10 Tier A generators; Tier B/C/D are separate follow-on plans that append to the same `GENERATORS` list.

**Tech Stack:** Node.js ESM (`.mjs`), `node:assert/strict` tests (no framework, matches existing convention), no new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-08-19-booking-data-sync-pipeline-design.md` (see "Generator layer (revisi 2026-08-19 sore...)" section — this plan implements exactly the 10 files listed under "Tier A").

## Global Constraints

- Node >= 18, ESM `.mjs`, no TypeScript, no new npm dependencies.
- Tests: plain `node:assert/strict`, run via `node <file>`, following `scripts/test/schema-contract.test.mjs`'s style (block-scoped `{ ... }` cases, final `console.log("<file>: all assertions passed")`).
- Every generator function is pure: `(context) => outputObject`. No I/O inside generator functions — `run-generators.mjs` owns all file reads/writes.
- Output write convention: `JSON.stringify(content, null, 2) + "\n"`, matching `sync-booking-data.mjs`.
- `context.overviewRecords` = the parsed array from `archive/booking-overview-snapshot/booking-overview.raw.json` (raw field names: `booking_id`, `id`, `orderChannel`, `package_id`, `package`, `duration`, `total_pax`, `booking_date`, `date{start,end,start_ymd,end_ymd,days}`, `pickup{meeting_point,meeting_point_arrival,meeting_point_value,pickup_time,text}`, `dropoff{drop_point,drop_point_arrival,drop_point_value,drop_time,text}`, `itinerary[]`, `hotels[]`, `tshirtSize`, `tshirtRaw{xss,xxs,xs,s,m,l,xl,xxl,xxxl}`, `vehicles[]`, `drivers[]{id,name,tags,photo,recap_this_month_escort}`, `guides[]{id,name,type,tags,photo,recap_this_month_escort,recap_this_month_ijen}`, `is_shuttle`, `at_ijen`, `financial{payment,balance,paymentMethod,paymentMethodLink,invoice{total,invoiceLink},expense{total,crew_expense,debt_expense,expenseLink},profit}`, `paymentHistory[]{id,booking_id,nominal,paymentMethodId,paymentMethod,description,receipt,reference,date}`, `notes`).
- `context.detailsBySlug` = a `Map<slug, bookingObject>` built from every `archive/customer-portal-detail-snapshot/details/*.raw.json` file whose `ok===true` and `json.success===true` — value is that file's `json.booking` object (raw field names: `id`, `booking_id` (this is the STRING ref like `"JVTO-3453"` — opposite of overview's numeric `booking_id`), `booking_code`, `channel`, `status`, `package_name`, `package_link`, `duration`, `travel_date_start`, `travel_date_end`, `total_pax`, `tshirt_sizes{xs,s,m,l,xl,xxl}`, `pickup`, `pickup_time`, `drop`, `drop_time`, `special_requirements`, `media_link`, `itineraries[]{day,title,itinerary,activity}`, `accommodations[]{day,name,rooms,banner}`, `crews{guides[]{id,name,role,photo},drivers[]{id,name,photo}}`, `vehicle_specs[]{name,capacity,banner,interior[]}`, `addons[]`, `finance{grand_total,total_addons,dp_amount,balance,paid_amount,due_date,initial_payment_method,balance_payment_method,payment_link,pending_upload_proof,uploaded_payment_proof,payment_history[]{id,nominal,description,method,created_at,reference}}`, `faq` (dict: category→{question:answer}), `packing_recommendations[]{category,items[]}`, `essential_checklist[]{item,checked}`).
- Every raw source field named in this plan was verified against real archive data during a research pass on 2026-08-19; treat the field-mapping tables as authoritative.

---

### Task 1: Generator context loader + runner harness

**Files:**
- Create: `scripts/lib/booking-sync/generators/context.mjs`
- Create: `scripts/run-generators.mjs`
- Test: `scripts/test/booking-sync/generators/context.test.mjs`
- Test: `scripts/test/booking-sync/run-generators.test.mjs`

**Interfaces:**
- Produces:
  - `loadGeneratorContext({archiveRoot?: string}): Promise<{overviewRecords: object[], detailsBySlug: Map<string, object>}>`
  - `runGenerators({archiveRoot?: string}): Promise<{written: string[]}>` — runs every entry in the internal `GENERATORS` array (empty in this task; later tasks append to it) in array order, writes each to `path.join(archiveRoot, outputPath)`.

- [ ] **Step 1: Write the failing test for the context loader**

Create `scripts/test/booking-sync/generators/context.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { loadGeneratorContext } from "../../../lib/booking-sync/generators/context.mjs";

async function withTempRoot(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "generator-context-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

{
  await withTempRoot(async (archiveRoot) => {
    const overviewDir = path.join(archiveRoot, "archive/booking-overview-snapshot");
    const detailsDir = path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details");
    await mkdir(overviewDir, { recursive: true });
    await mkdir(detailsDir, { recursive: true });

    await writeFile(
      path.join(overviewDir, "booking-overview.raw.json"),
      JSON.stringify([{ booking_id: 1 }, { booking_id: 2 }])
    );
    await writeFile(
      path.join(detailsDir, "slug-1.raw.json"),
      JSON.stringify({ slug: "slug-1", ok: true, json: { success: true, booking: { id: 1, booking_id: "JVTO-1" } } })
    );
    await writeFile(
      path.join(detailsDir, "slug-2.raw.json"),
      JSON.stringify({ slug: "slug-2", ok: false, json: null })
    );

    const context = await loadGeneratorContext({ archiveRoot });

    assert.equal(context.overviewRecords.length, 2);
    assert.equal(context.detailsBySlug.size, 1);
    assert.equal(context.detailsBySlug.get("slug-1").booking_id, "JVTO-1");
    assert.equal(context.detailsBySlug.has("slug-2"), false);
  });
}

console.log("context.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test/booking-sync/generators/context.test.mjs`
Expected: FAIL — `Cannot find module '../../../lib/booking-sync/generators/context.mjs'`

- [ ] **Step 3: Write the context loader implementation**

Create `scripts/lib/booking-sync/generators/context.mjs`:

```javascript
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export async function loadGeneratorContext({ archiveRoot = process.cwd() } = {}) {
  const overviewPath = path.join(archiveRoot, "archive/booking-overview-snapshot/booking-overview.raw.json");
  const detailsDir = path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details");

  const overviewRecords = JSON.parse(await readFile(overviewPath, "utf8"));

  const detailFiles = await readdir(detailsDir).catch(() => []);
  const detailsBySlug = new Map();
  for (const file of detailFiles) {
    if (!file.endsWith(".raw.json")) continue;
    const slug = file.slice(0, -".raw.json".length);
    const raw = JSON.parse(await readFile(path.join(detailsDir, file), "utf8"));
    if (raw.ok && raw.json && raw.json.success) {
      detailsBySlug.set(slug, raw.json.booking);
    }
  }

  return { overviewRecords, detailsBySlug };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test/booking-sync/generators/context.test.mjs`
Expected: PASS

- [ ] **Step 5: Write the failing test for the runner**

Create `scripts/test/booking-sync/run-generators.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runGenerators, GENERATORS } from "../../run-generators.mjs";

async function withTempRoot(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "run-generators-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

{
  await withTempRoot(async (archiveRoot) => {
    const overviewDir = path.join(archiveRoot, "archive/booking-overview-snapshot");
    const detailsDir = path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details");
    await mkdir(overviewDir, { recursive: true });
    await mkdir(detailsDir, { recursive: true });
    await writeFile(path.join(overviewDir, "booking-overview.raw.json"), JSON.stringify([{ booking_id: 1 }]));

    const originalLength = GENERATORS.length;
    GENERATORS.push({
      outputPath: "some/nested/dir/test-output.json",
      generate: (context) => ({ count: context.overviewRecords.length }),
    });

    try {
      const result = await runGenerators({ archiveRoot });
      assert.deepEqual(result.written, ["some/nested/dir/test-output.json"]);

      const written = JSON.parse(await readFile(path.join(archiveRoot, "some/nested/dir/test-output.json"), "utf8"));
      assert.deepEqual(written, { count: 1 });
    } finally {
      GENERATORS.length = originalLength;
    }
  });
}

console.log("run-generators.test.mjs: all assertions passed");
```

- [ ] **Step 6: Run test to verify it fails**

Run: `node scripts/test/booking-sync/run-generators.test.mjs`
Expected: FAIL — `Cannot find module '../../run-generators.mjs'`

- [ ] **Step 7: Write the runner implementation**

Create `scripts/run-generators.mjs`:

```javascript
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadGeneratorContext } from "./lib/booking-sync/generators/context.mjs";

export const GENERATORS = [];

export async function runGenerators({ archiveRoot = process.cwd() } = {}) {
  const context = await loadGeneratorContext({ archiveRoot });
  const written = [];
  for (const { outputPath, generate } of GENERATORS) {
    const content = generate(context);
    const fullPath = path.join(archiveRoot, outputPath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, JSON.stringify(content, null, 2) + "\n");
    written.push(outputPath);
  }
  return { written };
}

const isMainModule = path.resolve(process.argv[1] ?? "") === path.resolve(new URL(import.meta.url).pathname);
if (isMainModule) {
  const result = await runGenerators({});
  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node scripts/test/booking-sync/run-generators.test.mjs`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add scripts/lib/booking-sync/generators/context.mjs scripts/run-generators.mjs scripts/test/booking-sync/generators/context.test.mjs scripts/test/booking-sync/run-generators.test.mjs
git commit -m "feat(generators): add context loader and generator runner harness"
```

---

### Task 2: `booking-records.json` generator (Tier A foundation)

**Files:**
- Create: `scripts/lib/booking-sync/generators/booking-records.mjs`
- Test: `scripts/test/booking-sync/generators/booking-records.test.mjs`
- Modify: `scripts/run-generators.mjs` (register this generator)

**Interfaces:**
- Consumes: `context.overviewRecords` from Task 1.
- Produces: `generateBookingRecords(context: {overviewRecords}): {privacy: string, records: object[]}`. This is the FOUNDATION every Tier B generator (a later plan) will read as its own input — the exact output shape below is load-bearing for that later work, do not deviate from it.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/booking-sync/generators/booking-records.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { generateBookingRecords } from "../../../lib/booking-sync/generators/booking-records.mjs";

const rawRecord = {
  booking_id: 3390,
  id: "JVTO-3390",
  orderChannel: "JVTO",
  guest_id: 3753,
  guestDetails: { country_id: 101, country: "Indonesia" },
  total_pax: 8,
  duration: "3D 2N",
  package_id: 29,
  package: "3 Day Ijen, Bromo & Madakaripura Waterfall Discovery from Surabaya",
  booking_date: "12 May 2026",
  date: { start_ymd: "2026-08-01", end_ymd: "2026-08-03", start: "01 Aug 26", end: "03 Aug 26", days: "Sat - Mon" },
  pickup: { meeting_point: "Surabaya Airport", meeting_point_arrival: "Terminal 2", meeting_point_value: "SQ922", pickup_time: "09:10", text: "Surabaya Airport Terminal 2 SQ922" },
  dropoff: { drop_point: "", drop_point_arrival: null, drop_point_value: null, drop_time: "07:00", text: "  " },
  itinerary: [{ day: 1, date: "01 Aug 2026", itinerary: "Surabaya Airport - Bromo Area" }],
  hotels: [{ day: 1, checkIn: "01 Aug 2026", hotelId: 17, hotel: "Jiwa Jawa Bromo", rooms: [], meals: [] }],
  tshirtSize: "XS x 1, M x 4",
  tshirtRaw: { xss: 0, xxs: 0, xs: 1, s: 0, m: 4, l: 1, xl: 2, xxl: 0, xxxl: 0 },
  vehicles: ["Hiace Commuter"],
  drivers: [{ id: 9, name: "GARAGE", tags: "TWT,JVTO,KLOOK", photo: "http://x/photo.jpg", recap_this_month_escort: 31 }],
  guides: [{ id: 4, name: "Taufik", type: "Escort", tags: "JVTO,KLOOK,TWT", photo: "http://x/photo.jpg", recap_this_month_escort: 5, recap_this_month_ijen: 2 }],
  is_shuttle: "NO",
  at_ijen: "02 Aug 26",
  financial: {
    payment: 20400000,
    balance: -2600000,
    paymentMethod: "cc",
    paymentMethodLink: "https://x/pay",
    invoice: { total: 17800000, invoiceLink: ["http://x/inv"] },
    expense: { total: 11800000, crew_expense: "11320000.00", debt_expense: "480000.00", expenseLink: "/x" },
    profit: -14400000,
  },
  paymentHistory: [{ id: 626, booking_id: 3390, nominal: 3990000, paymentMethodId: 3, paymentMethod: "Debit/Credit Card", description: "Down Payment", receipt: "RCP/1", reference: "http://x/ref", date: "12 May 26 12:37" }],
  notes: "- Upgrade ke Artotal (by client)",
};

{
  const result = generateBookingRecords({ overviewRecords: [rawRecord] });
  assert.equal(typeof result.privacy, "string");
  assert.equal(result.records.length, 1);
  const r = result.records[0];

  assert.equal(r.bookingId, 3390);
  assert.equal(r.bookingCode, "JVTO-3390");
  assert.equal(r.orderChannel, "JVTO");
  assert.equal(r.packageId, 29);
  assert.equal(r.duration, "3D 2N");
  assert.deepEqual(r.tripDate, rawRecord.date);

  assert.equal(r.pickup.meetingPoint, "Surabaya Airport");
  assert.equal(r.pickup.complete, true);
  assert.equal(r.dropoff.complete, false, "dropoff.text is whitespace-only, must be incomplete");

  assert.deepEqual(r.itinerary, rawRecord.itinerary);
  assert.deepEqual(r.hotels, rawRecord.hotels);
  assert.deepEqual(r.tshirt, { text: "XS x 1, M x 4", sizes: rawRecord.tshirtRaw });
  assert.deepEqual(r.vehicles, ["Hiace Commuter"]);

  assert.equal(r.drivers.length, 1);
  assert.equal(r.drivers[0].id, 9);
  assert.equal(r.drivers[0].monthlyEscortCount, 31);
  assert.equal("photo" in r.drivers[0], false, "photo must be dropped");

  assert.equal(r.guides.length, 1);
  assert.equal(r.guides[0].role, "Escort");
  assert.equal(r.guides[0].monthlyIjenCount, 2);
  assert.equal("photo" in r.guides[0], false, "photo must be dropped");

  assert.equal(r.isShuttle, "NO");
  assert.equal(r.ijenDate, "02 Aug 26");

  assert.deepEqual(r.customer, { guestId: 3753, countryId: 101, country: "Indonesia" });
  assert.equal("name" in r.customer, false, "guest name must never appear");

  assert.equal(r.payment.paid, 20400000);
  assert.equal(r.payment.invoiceTotal, 17800000);
  assert.equal(r.payment.balance, -2600000);
  assert.equal(r.payment.paymentMethod, "cc");
  assert.equal("paymentMethodLink" in r.payment, false);
  assert.equal(r.payment.history.length, 1);
  assert.equal(r.payment.history[0].amount, 3990000);
  assert.equal(r.payment.history[0].method, "Debit/Credit Card");
  assert.equal("receipt" in r.payment.history[0], false);
  assert.equal("reference" in r.payment.history[0], false);

  assert.deepEqual(r.readiness, {
    hasPickup: true,
    hasDropoff: false,
    hasVehicle: true,
    hasDriver: true,
    hasGuide: true,
    hasHotels: true,
    hasPaymentHistory: true,
    hasNotes: true,
    balanceStatus: "overpaid_or_adjustment",
  });
}

{
  const settled = { ...rawRecord, financial: { ...rawRecord.financial, balance: 0 } };
  const dueOnly = { ...rawRecord, financial: { ...rawRecord.financial, balance: 500000 } };
  const result = generateBookingRecords({ overviewRecords: [settled, dueOnly] });
  assert.equal(result.records[0].readiness.balanceStatus, "settled");
  assert.equal(result.records[1].readiness.balanceStatus, "balance_due");
}

{
  const a = { ...rawRecord, booking_id: 1, date: { ...rawRecord.date, start_ymd: "2026-08-05" } };
  const b = { ...rawRecord, booking_id: 2, date: { ...rawRecord.date, start_ymd: "2026-08-01" } };
  const result = generateBookingRecords({ overviewRecords: [a, b] });
  assert.deepEqual(result.records.map((r) => r.bookingId), [2, 1], "must sort ascending by tripDate.start_ymd");
}

console.log("booking-records.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test/booking-sync/generators/booking-records.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/booking-sync/generators/booking-records.mjs`:

```javascript
const PRIVACY_NOTE =
  "Customer names, phones, emails, portal links, payment links, receipts, references, expense, profit, and free-form notes are excluded from this working file.";

function balanceStatus(balance) {
  if (balance > 0) return "balance_due";
  if (balance < 0) return "overpaid_or_adjustment";
  return "settled";
}

function readiness(raw) {
  return {
    hasPickup: Boolean(raw.pickup?.text?.trim()),
    hasDropoff: Boolean(raw.dropoff?.text?.trim()),
    hasVehicle: (raw.vehicles ?? []).length > 0,
    hasDriver: (raw.drivers ?? []).length > 0,
    hasGuide: (raw.guides ?? []).length > 0,
    hasHotels: (raw.hotels ?? []).length > 0,
    hasPaymentHistory: (raw.paymentHistory ?? []).length > 0,
    hasNotes: Boolean(raw.notes?.trim()),
    balanceStatus: balanceStatus(raw.financial?.balance ?? 0),
  };
}

function toBookingRecord(raw) {
  return {
    bookingId: raw.booking_id,
    bookingCode: raw.id,
    orderChannel: raw.orderChannel,
    packageId: raw.package_id,
    packageName: raw.package,
    duration: raw.duration,
    totalPax: raw.total_pax,
    bookingDate: raw.booking_date,
    tripDate: raw.date,
    pickup: {
      meetingPoint: raw.pickup?.meeting_point ?? null,
      arrival: raw.pickup?.meeting_point_arrival ?? null,
      value: raw.pickup?.meeting_point_value ?? null,
      time: raw.pickup?.pickup_time ?? null,
      text: raw.pickup?.text ?? null,
      complete: Boolean(raw.pickup?.text?.trim()),
    },
    dropoff: {
      dropPoint: raw.dropoff?.drop_point ?? null,
      arrival: raw.dropoff?.drop_point_arrival ?? null,
      value: raw.dropoff?.drop_point_value ?? null,
      time: raw.dropoff?.drop_time ?? null,
      text: raw.dropoff?.text ?? null,
      complete: Boolean(raw.dropoff?.text?.trim()),
    },
    itinerary: raw.itinerary ?? [],
    hotels: raw.hotels ?? [],
    tshirt: {
      text: raw.tshirtSize ?? null,
      sizes: raw.tshirtRaw ?? {},
    },
    vehicles: raw.vehicles ?? [],
    drivers: (raw.drivers ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      tags: d.tags,
      monthlyEscortCount: d.recap_this_month_escort ?? 0,
    })),
    guides: (raw.guides ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      role: g.type,
      tags: g.tags,
      monthlyEscortCount: g.recap_this_month_escort ?? 0,
      monthlyIjenCount: g.recap_this_month_ijen ?? 0,
    })),
    isShuttle: raw.is_shuttle,
    ijenDate: raw.at_ijen ?? null,
    customer: {
      guestId: raw.guest_id ?? null,
      countryId: raw.guestDetails?.country_id ?? null,
      country: raw.guestDetails?.country ?? null,
    },
    payment: {
      paid: raw.financial?.payment ?? 0,
      invoiceTotal: raw.financial?.invoice?.total ?? 0,
      balance: raw.financial?.balance ?? 0,
      paymentMethod: raw.financial?.paymentMethod ?? null,
      history: (raw.paymentHistory ?? []).map((p) => ({
        id: p.id,
        amount: p.nominal,
        methodId: p.paymentMethodId,
        method: p.paymentMethod,
        description: p.description,
        date: p.date,
      })),
    },
    readiness: readiness(raw),
  };
}

export function generateBookingRecords({ overviewRecords }) {
  const records = overviewRecords
    .map(toBookingRecord)
    .sort((a, b) => {
      if (a.tripDate.start_ymd < b.tripDate.start_ymd) return -1;
      if (a.tripDate.start_ymd > b.tripDate.start_ymd) return 1;
      return 0;
    });
  return { privacy: PRIVACY_NOTE, records };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test/booking-sync/generators/booking-records.test.mjs`
Expected: PASS

- [ ] **Step 5: Register in the runner**

Modify `scripts/run-generators.mjs` — add the import and the first `GENERATORS` entry:

```javascript
import { generateBookingRecords } from "./lib/booking-sync/generators/booking-records.mjs";
```

```javascript
export const GENERATORS = [
  { outputPath: "3-booking-and-journey-core/booking/booking-records.json", generate: generateBookingRecords },
];
```

- [ ] **Step 6: Run the full booking-sync test suite to confirm no regression**

Run: `npm run test:booking-sync`
Expected: PASS (this now also runs `run-generators.test.mjs`, which pushes/pops its own temp entry onto `GENERATORS` — confirm it still passes with a real entry already present)

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/booking-sync/generators/booking-records.mjs scripts/test/booking-sync/generators/booking-records.test.mjs scripts/run-generators.mjs
git commit -m "feat(generators): add booking-records.json generator"
```

---

### Task 3: `guest-portal-records.json` generator

**Files:**
- Create: `scripts/lib/booking-sync/generators/guest-portal-records.mjs`
- Test: `scripts/test/booking-sync/generators/guest-portal-records.test.mjs`
- Modify: `scripts/run-generators.mjs` (register)

**Interfaces:**
- Consumes: `context.overviewRecords` (same raw shape as Task 2 — reads `booking-overview.raw.json` directly, NOT `booking-records.json`'s output).
- Produces: `generateGuestPortalRecords(context: {overviewRecords}): {privacy: string, records: object[]}`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test/booking-sync/generators/guest-portal-records.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { generateGuestPortalRecords } from "../../../lib/booking-sync/generators/guest-portal-records.mjs";

function rawRecord(overrides = {}) {
  return {
    booking_id: 3390,
    id: "JVTO-3390",
    package: "3 Day Ijen, Bromo & Madakaripura Waterfall Discovery from Surabaya",
    date: { start_ymd: "2026-08-01", end_ymd: "2026-08-03", start: "01 Aug 26", end: "03 Aug 26", days: "Sat - Mon" },
    pickup: { meeting_point: "Surabaya Airport", meeting_point_arrival: "Terminal 2", meeting_point_value: "SQ922", pickup_time: "09:10", text: "Surabaya Airport Terminal 2 SQ922" },
    dropoff: { drop_point: "", drop_point_arrival: null, drop_point_value: null, drop_time: "07:00", text: "  " },
    itinerary: [{ day: 1, itinerary: "x" }],
    hotels: [{ day: 1, hotel: "Jiwa Jawa Bromo" }],
    tshirtSize: "XS x 1",
    tshirtRaw: { xss: 0, xxs: 0, xs: 1, s: 0, m: 0, l: 0, xl: 0, xxl: 0, xxxl: 0 },
    vehicles: ["Hiace Commuter"],
    drivers: [{ id: 1, name: "Someone" }],
    guides: [{ id: 2, name: "Someone Else" }],
    financial: { payment: 20400000, balance: -2600000, invoice: { total: 17800000 }, profit: -14400000, expense: { total: 11800000 } },
    ...overrides,
  };
}

{
  const result = generateGuestPortalRecords({ overviewRecords: [rawRecord()] });
  assert.equal(typeof result.privacy, "string");
  const r = result.records[0];

  assert.equal(r.bookingId, 3390);
  assert.equal(r.bookingCode, "JVTO-3390");
  assert.equal(r.packageName, rawRecord().package);
  assert.deepEqual(r.tripDate, rawRecord().date);
  assert.equal(r.pickup.complete, true);
  assert.equal(r.dropoff.complete, false);
  assert.deepEqual(r.vehicles, ["Hiace Commuter"]);

  assert.equal("drivers" in r, false, "crew/driver data must be entirely omitted");
  assert.equal("guides" in r, false, "crew/guide data must be entirely omitted");

  assert.deepEqual(r.payment, { invoiceTotal: 17800000, paid: 20400000, balance: -2600000 });
  assert.equal("profit" in r.payment, false);
  assert.equal("expense" in r.payment, false);

  assert.deepEqual(r.readiness, { hasPickup: true, hasDropoff: false, hasHotels: true, balanceStatus: "overpaid_or_adjustment" });
  assert.equal("hasVehicle" in r.readiness, false);
  assert.equal("hasDriver" in r.readiness, false);
  assert.equal("hasGuide" in r.readiness, false);
}

{
  // meeting_point_value present but text missing entirely -> still incomplete;
  // this confirms `complete` is driven by meeting_point + value, not by `text`
  const rec = rawRecord({ pickup: { meeting_point: "Surabaya Airport", meeting_point_value: null, pickup_time: "09:10", text: "Surabaya Airport" } });
  const result = generateGuestPortalRecords({ overviewRecords: [rec] });
  assert.equal(result.records[0].pickup.complete, false);
  assert.equal(result.records[0].readiness.hasPickup, false);
}

console.log("guest-portal-records.test.mjs: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test/booking-sync/generators/guest-portal-records.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/booking-sync/generators/guest-portal-records.mjs`:

```javascript
const PRIVACY_NOTE =
  "Guest-facing projection of booking data. Customer identity, crew/driver/guide details, and expense/profit figures are excluded.";

function balanceStatus(balance) {
  if (balance > 0) return "balance_due";
  if (balance < 0) return "overpaid_or_adjustment";
  return "settled";
}

function toGuestPortalRecord(raw) {
  const pickupComplete = Boolean(raw.pickup?.meeting_point && raw.pickup?.meeting_point_value);
  const dropoffComplete = Boolean(raw.dropoff?.drop_point && raw.dropoff?.drop_point_value);

  return {
    bookingId: raw.booking_id,
    bookingCode: raw.id,
    packageName: raw.package,
    tripDate: raw.date,
    pickup: {
      meetingPoint: raw.pickup?.meeting_point ?? null,
      arrival: raw.pickup?.meeting_point_arrival ?? null,
      value: raw.pickup?.meeting_point_value ?? null,
      time: raw.pickup?.pickup_time ?? null,
      text: raw.pickup?.text ?? null,
      complete: pickupComplete,
    },
    dropoff: {
      dropPoint: raw.dropoff?.drop_point ?? null,
      arrival: raw.dropoff?.drop_point_arrival ?? null,
      value: raw.dropoff?.drop_point_value ?? null,
      time: raw.dropoff?.drop_time ?? null,
      text: raw.dropoff?.text ?? null,
      complete: dropoffComplete,
    },
    itinerary: raw.itinerary ?? [],
    hotels: raw.hotels ?? [],
    tshirt: {
      text: raw.tshirtSize ?? null,
      sizes: raw.tshirtRaw ?? {},
    },
    vehicles: raw.vehicles ?? [],
    payment: {
      invoiceTotal: raw.financial?.invoice?.total ?? 0,
      paid: raw.financial?.payment ?? 0,
      balance: raw.financial?.balance ?? 0,
    },
    readiness: {
      hasPickup: pickupComplete,
      hasDropoff: dropoffComplete,
      hasHotels: (raw.hotels ?? []).length > 0,
      balanceStatus: balanceStatus(raw.financial?.balance ?? 0),
    },
  };
}

export function generateGuestPortalRecords({ overviewRecords }) {
  return { privacy: PRIVACY_NOTE, records: overviewRecords.map(toGuestPortalRecord) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test/booking-sync/generators/guest-portal-records.test.mjs`
Expected: PASS

- [ ] **Step 5: Register in the runner**

Modify `scripts/run-generators.mjs` — add the import and append to `GENERATORS`:

```javascript
import { generateGuestPortalRecords } from "./lib/booking-sync/generators/guest-portal-records.mjs";
```

```javascript
  { outputPath: "5-experience-engine/guest-portal/guest-portal-records.json", generate: generateGuestPortalRecords },
```

- [ ] **Step 6: Run the full booking-sync test suite**

Run: `npm run test:booking-sync`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/booking-sync/generators/guest-portal-records.mjs scripts/test/booking-sync/generators/guest-portal-records.test.mjs scripts/run-generators.mjs
git commit -m "feat(generators): add guest-portal-records.json generator"
```

---

### Task 4: The 8 `customer-portal-detail`-sourced generators (batch)

All 8 files below read `context.detailsBySlug` (never `overviewRecords`), and are keyed the same way: for every `booking_overview` record, resolve its slug from `customer_portal` URL... **correction, important**: `context.detailsBySlug` is already keyed by slug and its values are the detail `booking` objects directly — you do **not** need `overviewRecords` or slug-extraction for these 8 generators. Each one simply maps over `[...context.detailsBySlug.values()]` (order: iterate the Map in insertion order, which is `readdir`'s OS-returned order — sort every output array by `booking_id` ascending at the end of each generator for determinism, since `readdir` order is not guaranteed stable across OSes/runs).

**Files:**
- Create: `scripts/lib/booking-sync/generators/customer-portal-booking-details.mjs`
- Create: `scripts/lib/booking-sync/generators/customer-portal-logistics.mjs`
- Create: `scripts/lib/booking-sync/generators/customer-portal-itinerary-records.mjs`
- Create: `scripts/lib/booking-sync/generators/customer-portal-accommodation-records.mjs`
- Create: `scripts/lib/booking-sync/generators/customer-portal-crew-records.mjs`
- Create: `scripts/lib/booking-sync/generators/customer-portal-vehicle-records.mjs`
- Create: `scripts/lib/booking-sync/generators/customer-portal-detail-records.mjs`
- Create: `scripts/lib/booking-sync/generators/customer-portal-faq-packing-feed.mjs`
- Test: one test file per generator, same naming pattern under `scripts/test/booking-sync/generators/`
- Modify: `scripts/run-generators.mjs` (register all 8, appended in the order listed above)

**Interfaces:**
- Consumes: `context.detailsBySlug: Map<string, object>` from Task 1 (values are the raw `booking` objects described in Global Constraints).
- Produces: 8 `generateX(context: {detailsBySlug}): object` functions, one per file below, each registered in `run-generators.mjs`.

Every one of these 8 outputs follows the same top-level wrapper shape:
```javascript
{ schema_version: 1, generated_at: new Date().toISOString(), record_count: <N>, privacy: "<string, see below>", records: [...] }
```
(`customer-portal-itinerary-records.json` is the one exception — no `privacy` key, confirmed by research as an inconsistency in the original manually-written files; keep it consistent with the original and omit `privacy` for that one file only.)

Since `generated_at` must be current at generation time, every generator in this batch takes an optional second `now` parameter (default `new Date()`) so tests can pin it: `generateX(context, { now = new Date() } = {})`.

#### 4a. `customer-portal-booking-details.mjs` → `3-booking-and-journey-core/booking/customer-portal-booking-details.json`

Privacy string: `"No customer names, contact details, portal slugs, payment links, media links, payment references, or uploaded proof URLs are stored."`

Per-record shape: `{booking_id, booking_ref, booking_code, channel, status, product{package_name,package_link,duration,travel_date_start,travel_date_end,total_pax}, tshirt_sizes, addons, finance{grand_total,total_addons,dp_amount,balance,paid_amount,due_date,initial_payment_method,balance_payment_method,payment_link_present,pending_upload_proof,uploaded_payment_proof_present,payment_history[]}}`.

Field mapping (source is the detail `booking` object):
| Output | Source | Transform |
|---|---|---|
| `booking_id` | `.id` | copy (numeric) |
| `booking_ref` | `.booking_id` | copy (the string ref, e.g. `"JVTO-3453"` — note the source field name is the OPPOSITE of the output field name) |
| `booking_code`/`channel`/`status` | same names | copy |
| `product.*` | `.package_name`/`.package_link`/`.duration`/`.travel_date_start`/`.travel_date_end`/`.total_pax` | copy |
| `tshirt_sizes`/`addons` | same names | copy verbatim (arrays/objects as-is) |
| `finance.grand_total` | — | **computed**: `(finance.dp_amount ?? 0) + (finance.balance ?? 0)` — do NOT use raw `finance.grand_total`, it's unreliable (often just duplicates `dp_amount`) |
| `finance.total_addons`/`dp_amount`/`balance`/`paid_amount`/`due_date`/`initial_payment_method`/`balance_payment_method` | same names under `.finance` | copy |
| `finance.payment_link_present` | `.finance.payment_link` | `!= null` |
| `finance.uploaded_payment_proof_present` | `.finance.uploaded_payment_proof` | `!= null` |
| `finance.payment_history[].id`/`.nominal`/`.description`/`.method`/`.created_at` | same names | copy |
| `finance.payment_history[].reference_present` | `.reference` | `!= null` |

Test must cover: `grand_total` computed (not copied), `payment_link_present`/`uploaded_payment_proof_present`/`reference_present` all correctly `true` when source is non-null and `false` when null, and confirm raw-only fields (`pickup`, `special_requirements`, `crews`, `itineraries`, etc.) never leak into the output object (assert `!("pickup" in record)` etc. for at least 2 dropped fields).

#### 4b. `customer-portal-logistics.mjs` → `3-booking-and-journey-core/pickup-and-dropoff/customer-portal-logistics.json`

Privacy string: `"Logistics values are operational booking fields. Customer identity and portal access slugs are excluded."`

Per-record shape: `{booking_id, booking_ref, status, travel_date_start, travel_date_end, total_pax, logistics{pickup, pickup_time, drop, drop_time, special_requirements_present}}`.

| Output | Source | Transform |
|---|---|---|
| `booking_id` | `.id` | copy |
| `booking_ref` | `.booking_id` | copy (string ref) |
| `status`/`travel_date_start`/`travel_date_end`/`total_pax` | same names | copy |
| `logistics.pickup`/`.pickup_time`/`.drop`/`.drop_time` | `.pickup`/`.pickup_time`/`.drop`/`.drop_time` | copy verbatim (keep the seconds precision, e.g. `"10:47:00"` — do not reformat) |
| `logistics.special_requirements_present` | `.special_requirements` | `Boolean(text?.trim())` |

#### 4c. `customer-portal-itinerary-records.mjs` → `2-product-and-commercial-core/routes-and-itineraries/customer-portal-itinerary-records.json`

**No `privacy` key in this output** (matches the original files' inconsistency — do not add one).

Per-record shape: `{booking_id, booking_ref, package_name, duration, itinerary_days[]}`.

| Output | Source | Transform |
|---|---|---|
| `booking_id` | `.id` | copy |
| `booking_ref` | `.booking_id` | copy (string ref) |
| `package_name`/`duration` | same names | copy |
| `itinerary_days[].day`/`.title`/`.itinerary` | `.itineraries[].day`/`.title`/`.itinerary` | copy |
| `itinerary_days[].activity_text` | `.itineraries[].activity` | rename + **collapse any run of 2+ spaces to a single space** (`text.replace(/\s{2,}/g, " ")`) |

#### 4d. `customer-portal-accommodation-records.mjs` → `4-operations-core/hotel-and-partner-confirmation/customer-portal-accommodation-records.json`

No `privacy` key needed at the record level — mirror the original: `{schema_version, generated_at, record_count, records}` (no `privacy` key at all for this file, per the original).

Per-record shape: `{booking_id, booking_ref, package_name, travel_date_start, accommodations[]}`.

| Output | Source | Transform |
|---|---|---|
| `booking_id`/`booking_ref` | `.id`/`.booking_id` | copy (same string/numeric split as above) |
| `package_name`/`travel_date_start` | same names | copy |
| `accommodations[].day`/`.name`/`.rooms` | `.accommodations[].day`/`.name`/`.rooms` | copy (`rooms` stays a string, can be `""`) |
| `accommodations[].banner_present` | `.accommodations[].banner` | `Boolean(banner)` |

Preserve array order exactly as it appears in the source `accommodations[]` array — do NOT sort by `day` (verified: source order is not always day-ascending).

#### 4e. `customer-portal-crew-records.mjs` → `4-operations-core/crew-assignment/customer-portal-crew-records.json`

Privacy string (verbatim): `"Crew names and public-facing roles/photos-present flags are retained; crew phone numbers are not present in the source portal payload and are not stored."`

Per-record shape: `{booking_id, booking_ref, package_name, travel_date_start, crews: {guides: [...], drivers: [...]}}`.

| Output | Source | Transform |
|---|---|---|
| `booking_id`/`booking_ref`/`package_name`/`travel_date_start` | same as 4d | copy |
| `crews.guides[].id`/`.name`/`.role` | `.crews.guides[].id`/`.name`/`.role` | copy (role is already text like `"Escort Guide"`) |
| `crews.guides[].photo_present` | `.crews.guides[].photo` | `Boolean(photo)` |
| `crews.drivers[]` | `.crews.drivers[]` | same shape/transform as guides (id/name/photo_present) |

#### 4f. `customer-portal-vehicle-records.mjs` → `4-operations-core/vehicle-assignment/customer-portal-vehicle-records.json`

No `privacy` key (matches original).

Per-record shape: `{booking_id, booking_ref, package_name, total_pax, vehicles[]}`.

| Output | Source | Transform |
|---|---|---|
| `booking_id`/`booking_ref`/`package_name` | same as 4d | copy |
| `total_pax` | `.total_pax` | copy |
| `vehicles[].name`/`.capacity` | `.vehicle_specs[].name`/`.capacity` | copy |
| `vehicles[].banner_present` | `.vehicle_specs[].banner` | `Boolean(banner)` |
| `vehicles[].interior_image_count` | `.vehicle_specs[].interior` | `(interior ?? []).length` |

#### 4g. `customer-portal-detail-records.mjs` → `5-experience-engine/guest-portal/customer-portal-detail-records.json`

This is the most comprehensive of the 8 — a fuller per-booking projection.

Per-record shape: `{booking_id, booking_ref, booking_code, channel, status, portal_record_id, product{}, logistics{}, tshirt_sizes, itinerary_days[], accommodations[], addons[], crews{guides[],drivers[]}, vehicles[], finance{}, portal_content{}}`.

| Output | Source | Transform |
|---|---|---|
| `booking_id`/`booking_ref`/`booking_code`/`channel`/`status` | `.id`/`.booking_id`/`.booking_code`/`.channel`/`.status` | copy |
| `portal_record_id` | the Map key (slug) | pseudonymize: `` `portal_${sha256(slug).slice(0,16)}` `` using `node:crypto`'s `createHash("sha256")` — one-way, not reversible without the slug map (do not store the raw slug in this output) |
| `product.*` | `.package_name`/`.package_link`/`.duration`/`.travel_date_start`/`.travel_date_end`/`.total_pax` | copy (same as 4a's `product`) |
| `logistics.pickup`/`.drop`/`.pickup_time`/`.drop_time` | same as 4b | copy |
| `logistics.special_requirements_present` | `.special_requirements` | same as 4b |
| `tshirt_sizes` | `.tshirt_sizes` | copy |
| `itinerary_days` | `.itineraries[]` | same rename+whitespace-collapse as 4c (`activity`→`activity_text`) |
| `accommodations` | `.accommodations[]` | same as 4d (`banner_present`) |
| `addons` | `.addons[]` | copy verbatim |
| `crews.guides`/`crews.drivers` | `.crews.guides[]`/`.crews.drivers[]` | same as 4e (`photo_present`) |
| `vehicles` | `.vehicle_specs[]` | same as 4f (`banner_present`, `interior_image_count`) |
| `finance.*` | `.finance.*` | same as 4a's `finance`, PLUS `finance.payment_history[]` uses the same `reference_present` transform as 4a |
| `portal_content.faq_categories` | `.faq` (dict category→{question:answer}) | `Object.keys(faq ?? {})` |
| `portal_content.packing_categories` | `.packing_recommendations[]` | `.map(p => p.category)` |
| `portal_content.essential_checklist` | `.essential_checklist[]` | copy each item's `{item}` plus `checked: false` (always `false` — do not copy source `checked` value, per research the source's own `checked` is not meaningful state) |
| `portal_content.media_link_present` | `.media_link` | `!= null` |

#### 4h. `customer-portal-faq-packing-feed.mjs` → `5-experience-engine/knowledge-feed/customer-portal-faq-packing-feed.json`

**This one is a GLOBAL dedup across every booking in `detailsBySlug`, not a per-booking record list.**

Output shape: `{schema_version, generated_at, faq_count, packing_category_count, checklist_item_count, faqs: [...], packing_recommendations: [...], essential_checklist: [...]}`.

Logic:
- `faqs[]`: flatten every booking's `.faq` dict (category → {question: answer}) into `{category, question, answer}` triples across ALL bookings, then dedupe by `(category, question)` pair. **Tie-break rule when the same (category, question) has different answers across bookings** (this happens — verified, one real conflict exists in current data): use **majority vote** (the answer text that appears most often across all bookings for that question); if tied, use the answer belonging to the lowest `booking_id`. Implement this deterministically — don't just take "first seen in iteration order" since Map/readdir order isn't guaranteed stable.
- `packing_recommendations[]`: flatten every booking's `.packing_recommendations[]` (`{category, items[]}`), dedupe by `category` (keep the first `items[]` array seen for each category — verified byte-identical across all bookings in current data, so any occurrence is correct).
- `essential_checklist[]`: flatten every booking's `.essential_checklist[]`, dedupe by `item` text (drop each source item's `checked` field entirely — not even set to `false`, just omit the key).
- Counts are `.length` of each respective output array.

Test must include a fixture with 2 bookings whose `faq` has the SAME category+question but DIFFERENT answers with different booking_ids, and assert the majority-vote (or lowest-booking_id-on-tie) rule picks correctly.

---

**Steps for Task 4** (apply this same TDD cycle to each of the 8 sub-generators 4a–4h in the order listed):

- [ ] **Step 1: Write the failing test for generator 4a** (`customer-portal-booking-details.test.mjs`) using a realistic fixture `booking` object built from the field table above (include at least one null `payment_link`/`uploaded_payment_proof`/payment-history `reference` to test the `_present` booleans both ways), asserting every output field and asserting at least 3 dropped fields are absent.
- [ ] **Step 2: Run it, confirm it fails** (module not found).
- [ ] **Step 3: Implement `customer-portal-booking-details.mjs`** per the field table.
- [ ] **Step 4: Run it, confirm it passes.**
- [ ] **Step 5: Register in `run-generators.mjs`, run `npm run test:booking-sync`, confirm still green.**
- [ ] **Step 6: Repeat Steps 1–5 for 4b, 4c, 4d, 4e, 4f, 4g** (same TDD cycle, one sub-generator at a time — do not batch the implementation into one giant diff without intermediate green runs).
- [ ] **Step 7: Write the failing test for 4h** (the dedup/global one — needs the majority-vote fixture described above).
- [ ] **Step 8: Run it, confirm it fails.**
- [ ] **Step 9: Implement `customer-portal-faq-packing-feed.mjs`.**
- [ ] **Step 10: Run it, confirm it passes.**
- [ ] **Step 11: Register in `run-generators.mjs`. Run `npm run test:booking-sync` (full suite, all 8 + everything from Tasks 1–3) — confirm everything is green, pristine output.**
- [ ] **Step 12: Commit** (one commit for the whole batch is fine given they're one cohesive unit of work):

```bash
git add scripts/lib/booking-sync/generators/customer-portal-*.mjs scripts/test/booking-sync/generators/customer-portal-*.test.mjs scripts/run-generators.mjs
git commit -m "feat(generators): add 8 customer-portal-detail-sourced generators"
```

---

### Task 5: Wire generators into the sync pipeline and fix the deploy paths-ignore gap

**Files:**
- Modify: `scripts/sync-booking-data.mjs` (call `runGenerators` after a real archive write)
- Modify: `.github/workflows/deploy-vps.yml` (extend `paths-ignore`)
- Test: extend `scripts/test/booking-sync/sync-booking-data.test.mjs`

**Interfaces:**
- Consumes: `runGenerators` from `scripts/run-generators.mjs` (Task 1), now with 10 registered generators (Tasks 2–4).

- [ ] **Step 1: Write the failing test**

Add a new test block to `scripts/test/booking-sync/sync-booking-data.test.mjs` (append, don't replace existing blocks):

```javascript
{
  await withTempRoot(async (archiveRoot) => {
    const stubOverview = async (month) =>
      month === "2026-08"
        ? { records: [{ booking_id: 1, customer_portal: "https://x/my-booking/slug-1" }], headers: "h" }
        : { records: [], headers: "h" };

    await runSync({
      now: new Date("2026-08-15T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: stubOverview,
      fetchCustomerPortalDetail: async (slug) => ({
        slug,
        url: `https://legacy.javavolcano-touroperator.com/bookings/details/${slug}?json=true`,
        statusCode: 200,
        ok: true,
        error: null,
        json: { success: true, booking: { id: 1, booking_id: "JVTO-1" } },
      }),
    });

    const bookingRecords = JSON.parse(
      await readFile(path.join(archiveRoot, "3-booking-and-journey-core/booking/booking-records.json"), "utf8")
    );
    assert.equal(bookingRecords.records.length, 1);
    assert.equal(bookingRecords.records[0].bookingId, 1);
  });
}
```

- [ ] **Step 2: Run it, confirm it fails** (generator output file doesn't exist yet — `runSync` doesn't call `runGenerators`).

- [ ] **Step 3: Wire it in**

In `scripts/sync-booking-data.mjs`: import `runGenerators` from `./run-generators.mjs`, and call it right after the `fetch-manifest.json` write (the last step of the existing write sequence), only inside the same branch that performs writes (i.e., it must NOT run when `dryRun || !hasChanges` triggered the early return):

```javascript
import { runGenerators } from "./run-generators.mjs";
```

Add the call as the final statement before `return { diff, report, detailResults };` in the non-early-return path:

```javascript
  await runGenerators({ archiveRoot });

  return { diff, report, detailResults };
```

- [ ] **Step 4: Run it, confirm it passes.**

- [ ] **Step 5: Run the full booking-sync suite**

Run: `npm run test:booking-sync`
Expected: PASS, pristine.

- [ ] **Step 6: Extend `deploy-vps.yml`'s `paths-ignore`**

In `.github/workflows/deploy-vps.yml`, find the `paths-ignore` block added by the previous plan:

```yaml
    paths-ignore:
      - 'archive/booking-overview-snapshot/**'
      - 'archive/customer-portal-detail-snapshot/**'
      - '3-booking-and-journey-core/**'
      - '4-operations-core/**'
```

Replace with (adding the 6 precise file-level entries this plan's generators write to — do NOT add broad `2-product-and-commercial-core/**` or `5-experience-engine/**` globs, since those directories contain real website-output files this deploy workflow must still react to):

```yaml
    paths-ignore:
      - 'archive/booking-overview-snapshot/**'
      - 'archive/customer-portal-detail-snapshot/**'
      - '3-booking-and-journey-core/**'
      - '4-operations-core/**'
      - '2-product-and-commercial-core/routes-and-itineraries/customer-portal-itinerary-records.json'
      - '5-experience-engine/guest-portal/customer-portal-detail-records.json'
      - '5-experience-engine/guest-portal/guest-portal-records.json'
      - '5-experience-engine/knowledge-feed/customer-portal-faq-packing-feed.json'
```

(Only 4 of the 6 Tier-A `5-experience-engine`/`2-product-and-commercial-core` outputs are listed here — `booking-channel-payment-readiness-summary.json` and `profitability-summary.json` are Tier C, built in a later plan; add them to this same list in that plan, don't add them now since they don't exist yet.)

- [ ] **Step 7: Validate YAML and confirm nothing else changed**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/deploy-vps.yml', 'utf8')); console.log('YAML OK')"
git diff .github/workflows/deploy-vps.yml
```

Expected: `YAML OK`, diff shows only the 4 new lines added to `paths-ignore`.

- [ ] **Step 8: Update the sync workflow's `git add` scope**

In `.github/workflows/sync-booking-data.yml`, the "Commit and push if changed" step currently does `git add archive/booking-overview-snapshot archive/customer-portal-detail-snapshot` and checks `git status --porcelain -- archive/booking-overview-snapshot archive/customer-portal-detail-snapshot`. Both must be extended to also cover the generator output directories, or the new generator files will never get committed. Replace both the `git status --porcelain --` pathspec list and the `git add` pathspec list with:

```
archive/booking-overview-snapshot archive/customer-portal-detail-snapshot 2-product-and-commercial-core 3-booking-and-journey-core 4-operations-core 5-experience-engine
```

(Full directory globs are fine here, unlike `deploy-vps.yml` — this workflow's `git add` only ever stages what the sync script actually wrote, since untouched files never show up in `git status --porcelain` for those directories.)

- [ ] **Step 9: Validate YAML**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/sync-booking-data.yml', 'utf8')); console.log('YAML OK')"
```

- [ ] **Step 10: Commit**

```bash
git add scripts/sync-booking-data.mjs scripts/test/booking-sync/sync-booking-data.test.mjs .github/workflows/deploy-vps.yml .github/workflows/sync-booking-data.yml
git commit -m "feat(generators): wire generator runner into sync pipeline, extend deploy-ignore and commit scope"
```

---

### Task 6: Real dry-run-equivalent verification against the live archive

**Files:** none created or modified — verification only.

- [ ] **Step 1: Run the generators against the real, current archive**

Run: `node scripts/run-generators.mjs`
Expected: exits 0, prints `{"written": [...10 paths...]}`.

- [ ] **Step 2: Inspect the diff**

```bash
git status --porcelain -- 2-product-and-commercial-core 3-booking-and-journey-core 4-operations-core 5-experience-engine
git diff --stat -- 2-product-and-commercial-core 3-booking-and-journey-core 4-operations-core 5-experience-engine
```

Expected: the 10 target files show as changed (record counts should reflect the current ~136-booking archive, not the old 74 — this is expected per the spec's scoping decision, not a bug). Confirm no file OUTSIDE the 10 registered generator outputs changed.

- [ ] **Step 3: Spot-check one output file's content by hand**

Read `3-booking-and-journey-core/booking/booking-records.json` and confirm: `records.length` matches the current `archive/booking-overview-snapshot/booking-overview.raw.json` record count, no `customer_name`/`phone`/`email` field appears anywhere in the file (`grep -iE "email|phone" 3-booking-and-journey-core/booking/booking-records.json` should print nothing).

- [ ] **Step 4: Commit the regenerated files**

```bash
git add 2-product-and-commercial-core/routes-and-itineraries/customer-portal-itinerary-records.json 3-booking-and-journey-core/booking/booking-records.json 3-booking-and-journey-core/booking/customer-portal-booking-details.json 3-booking-and-journey-core/pickup-and-dropoff/customer-portal-logistics.json 4-operations-core/hotel-and-partner-confirmation/customer-portal-accommodation-records.json 4-operations-core/crew-assignment/customer-portal-crew-records.json 4-operations-core/vehicle-assignment/customer-portal-vehicle-records.json 5-experience-engine/guest-portal/customer-portal-detail-records.json 5-experience-engine/guest-portal/guest-portal-records.json 5-experience-engine/knowledge-feed/customer-portal-faq-packing-feed.json
git commit -m "chore(generators): regenerate Tier A derived files from current archive"
```

Do NOT push — same as the previous plan's final task, leave this ready to push alongside the rest of the branch.
