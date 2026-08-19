import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
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

function stubDetail(slug, bookingExtra = {}) {
  return {
    slug,
    url: `https://legacy.javavolcano-touroperator.com/bookings/details/${slug}?json=true`,
    statusCode: 200,
    ok: true,
    error: null,
    json: { success: true, booking: { slug, ...bookingExtra } },
  };
}

function failedDetail(slug) {
  return {
    slug,
    url: `https://legacy.javavolcano-touroperator.com/bookings/details/${slug}?json=true`,
    statusCode: 500,
    ok: false,
    error: "upstream 500",
    json: null,
  };
}

function overviewStub(recordsByMonth) {
  return async (month) => ({ records: recordsByMonth[month] ?? [], headers: "content-type: application/json" });
}

// Recursively snapshot every file under `root` as { relativePath: contents } so
// a later run can be proven byte-for-byte non-mutating.
async function snapshotTree(root) {
  const snapshot = {};
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === "ENOENT") return;
      throw err;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        snapshot[path.relative(root, full)] = await readFile(full, "utf8");
      }
    }
  }
  await walk(root);
  return snapshot;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
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
    // Four bookings, one removed = 25%, deliberately under the 30%
    // mass-removal guard threshold so this exercises normal removal.
    const firstOverview = async (month) =>
      month === "2026-08"
        ? {
            records: [1, 2, 3, 4].map((id) => ({ booking_id: id, customer_portal: `https://x/my-booking/slug-${id}` })),
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
        ? {
            records: [1, 3, 4].map((id) => ({ booking_id: id, customer_portal: `https://x/my-booking/slug-${id}` })),
            headers: "content-type: application/json",
          }
        : { records: [], headers: "content-type: application/json" };

    const result = await runSync({
      now: new Date("2026-08-16T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: secondOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    assert.deepEqual(result.diff.removed, ["2"]);
    assert.deepEqual(result.diff.unchanged, ["1", "3", "4"]);

    await assert.rejects(() =>
      readFile(path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details/slug-2.raw.json"), "utf8")
    );
    const detail1Still = await readFile(
      path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details/slug-1.raw.json"),
      "utf8"
    );
    assert.ok(detail1Still.includes("slug-1"));

    const portalManifestAfterSecondRun = JSON.parse(
      await readFile(path.join(archiveRoot, "archive/customer-portal-detail-snapshot/fetch-manifest.json"), "utf8")
    );
    const slug1Entry = portalManifestAfterSecondRun.results.find((r) => r.slug === "slug-1");
    assert.ok(slug1Entry, "expected fetch-manifest.json to still have an entry for slug-1");
    assert.equal(slug1Entry.statusCode, 200);
    assert.equal(slug1Entry.ok, true);
    assert.equal(slug1Entry.error, null);
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

// I1: a run with nothing added/removed/updated must not touch a single file.
{
  await withTempRoot(async (archiveRoot) => {
    const stubOverview = overviewStub({
      "2026-08": [
        { booking_id: 1, customer_portal: "https://x/my-booking/slug-1" },
        { booking_id: 2, customer_portal: "https://x/my-booking/slug-2" },
      ],
    });

    await runSync({
      now: new Date("2026-08-15T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: stubOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    const before = await snapshotTree(archiveRoot);
    assert.ok(Object.keys(before).length > 0, "expected the first run to have written files");

    // Deliberately a different `now` — timestamps must not leak into the tree.
    const second = await runSync({
      now: new Date("2026-08-16T12:34:56Z"),
      archiveRoot,
      fetchBookingOverviewMonth: stubOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    assert.deepEqual(second.diff.added, []);
    assert.deepEqual(second.diff.removed, []);
    assert.deepEqual(second.diff.updated, []);
    assert.deepEqual(second.diff.unchanged, ["1", "2"]);

    const after = await snapshotTree(archiveRoot);
    assert.deepEqual(after, before, "a no-change run must leave the archive byte-identical");
  });
}

// C1: a failed detail fetch must not clobber the existing file, must not be
// recorded as current in sync-manifest.json, and must be retried next run.
{
  await withTempRoot(async (archiveRoot) => {
    const detailsDir = path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details");
    const slug2File = path.join(detailsDir, "slug-2.raw.json");

    const firstOverview = overviewStub({
      "2026-08": [
        { booking_id: 1, customer_portal: "https://x/my-booking/slug-1" },
        { booking_id: 2, customer_portal: "https://x/my-booking/slug-2", guest: "original" },
      ],
    });

    await runSync({
      now: new Date("2026-08-15T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: firstOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug, { marker: "original" }),
    });

    const goodDetailBefore = await readFile(slug2File, "utf8");
    assert.ok(goodDetailBefore.includes("original"));

    // Booking 2 changes upstream (-> `updated`), but its detail fetch fails.
    const secondOverview = overviewStub({
      "2026-08": [
        { booking_id: 1, customer_portal: "https://x/my-booking/slug-1" },
        { booking_id: 2, customer_portal: "https://x/my-booking/slug-2", guest: "changed" },
      ],
    });

    const failedRun = await runSync({
      now: new Date("2026-08-16T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: secondOverview,
      fetchCustomerPortalDetail: async (slug) => (slug === "slug-2" ? failedDetail(slug) : stubDetail(slug, { marker: "original" })),
    });

    assert.deepEqual(failedRun.diff.updated, ["2"]);
    assert.deepEqual(failedRun.report.failedDetailFetches, ["slug-2"]);

    // The pre-existing good file is left exactly as it was.
    assert.equal(await readFile(slug2File, "utf8"), goodDetailBefore);

    // sync-manifest.json must not claim booking 2 is current...
    const manifestAfterFailure = JSON.parse(
      await readFile(path.join(archiveRoot, "archive/booking-overview-snapshot/sync-manifest.json"), "utf8")
    );
    assert.ok(manifestAfterFailure["1"], "booking 1 synced fine and must stay in the manifest");
    assert.equal(manifestAfterFailure["2"], undefined, "a failed detail fetch must not be committed to sync-manifest.json");

    // ...but sync-report.json and fetch-manifest.json must report the failure honestly.
    const reportAfterFailure = JSON.parse(
      await readFile(path.join(archiveRoot, "archive/booking-overview-snapshot/sync-report.json"), "utf8")
    );
    assert.deepEqual(reportAfterFailure.failedDetailFetches, ["slug-2"]);
    const fetchManifestAfterFailure = JSON.parse(
      await readFile(path.join(archiveRoot, "archive/customer-portal-detail-snapshot/fetch-manifest.json"), "utf8")
    );
    const failedEntry = fetchManifestAfterFailure.results.find((r) => r.slug === "slug-2");
    assert.equal(failedEntry.ok, false);
    assert.equal(failedEntry.statusCode, 500);
    assert.equal(failedEntry.error, "upstream 500");

    // Third run, same records, upstream recovered: booking 2 is retried.
    const retryRun = await runSync({
      now: new Date("2026-08-17T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: secondOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug, { marker: "recovered" }),
    });

    assert.deepEqual(retryRun.diff.added, ["2"], "the failed booking must be retried, not stuck as unchanged");
    assert.deepEqual(retryRun.report.failedDetailFetches, []);

    const slug2After = JSON.parse(await readFile(slug2File, "utf8"));
    assert.equal(slug2After.ok, true);
    assert.equal(slug2After.json.booking.marker, "recovered");

    const manifestAfterRetry = JSON.parse(
      await readFile(path.join(archiveRoot, "archive/booking-overview-snapshot/sync-manifest.json"), "utf8")
    );
    assert.ok(manifestAfterRetry["2"], "after a successful retry the booking must be committed to sync-manifest.json");
  });
}

// I3: a degraded upstream returning far fewer bookings must abort, not delete.
{
  await withTempRoot(async (archiveRoot) => {
    const healthyOverview = overviewStub({
      "2026-08": [1, 2, 3, 4, 5].map((id) => ({ booking_id: id, customer_portal: `https://x/my-booking/slug-${id}` })),
    });

    await runSync({
      now: new Date("2026-08-15T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: healthyOverview,
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    const before = await snapshotTree(archiveRoot);

    // Only 3 of 5 come back -> 2 removed of 5 known = 40% > 30% threshold.
    const degradedOverview = overviewStub({
      "2026-08": [1, 2, 3].map((id) => ({ booking_id: id, customer_portal: `https://x/my-booking/slug-${id}` })),
    });

    await assert.rejects(
      () =>
        runSync({
          now: new Date("2026-08-16T00:00:00Z"),
          archiveRoot,
          fetchBookingOverviewMonth: degradedOverview,
          fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
        }),
      /mass-removal threshold/
    );

    const after = await snapshotTree(archiveRoot);
    assert.deepEqual(after, before, "the mass-removal guard must abort before writing anything");

    // The guard runs in dry-run too — that is the point of dry-run.
    await assert.rejects(
      () =>
        runSync({
          dryRun: true,
          now: new Date("2026-08-16T00:00:00Z"),
          archiveRoot,
          fetchBookingOverviewMonth: degradedOverview,
          fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
        }),
      /mass-removal threshold/
    );
  });
}

// I3 follow-up: a UTC month rollover moves the rolling two-month fetch window,
// so the whole departing month legitimately leaves at once. That must NOT trip
// the mass-removal guard, while a genuine degraded upstream still must.
{
  await withTempRoot(async (archiveRoot) => {
    const detailsDir = path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details");
    const manifestPath = path.join(archiveRoot, "archive/booking-overview-snapshot/sync-manifest.json");
    const reportPath = path.join(archiveRoot, "archive/booking-overview-snapshot/sync-report.json");
    const record = (id) => ({ booking_id: id, customer_portal: `https://x/my-booking/slug-${id}` });

    // Mid-August run: window is 2026-08 + 2026-09, five August bookings known.
    await runSync({
      now: new Date("2026-08-15T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: overviewStub({ "2026-08": [1, 2, 3, 4, 5].map(record) }),
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    assert.deepEqual(JSON.parse(await readFile(reportPath, "utf8")).months, ["2026-08", "2026-09"]);

    // 1 September: window becomes 2026-09 + 2026-10. All five August bookings
    // drop out of the window = 100% removed, far above the 30% threshold, and
    // under the pre-fix guard this threw and deadlocked the pipeline for the
    // whole month. It must now succeed.
    const rollover = await runSync({
      now: new Date("2026-09-01T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: overviewStub({ "2026-09": [6, 7, 8, 9, 10, 11].map(record) }),
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    assert.deepEqual(rollover.diff.removed, ["1", "2", "3", "4", "5"]);
    assert.deepEqual(rollover.diff.added, ["6", "7", "8", "9", "10", "11"]);
    assert.deepEqual(JSON.parse(await readFile(reportPath, "utf8")).months, ["2026-09", "2026-10"]);
    assert.deepEqual(Object.keys(JSON.parse(await readFile(manifestPath, "utf8"))).sort(), [
      "10",
      "11",
      "6",
      "7",
      "8",
      "9",
    ]);
    assert.equal(await exists(path.join(detailsDir, "slug-1.raw.json")), false);
    assert.equal(await exists(path.join(detailsDir, "slug-6.raw.json")), true);

    // Mid-September, window unchanged at 2026-09 + 2026-10: a degraded upstream
    // dropping 2 of 6 (33%) must still abort. The rollover fix must not have
    // weakened the same-window case.
    const stateBefore = await snapshotTree(archiveRoot);
    await assert.rejects(
      () =>
        runSync({
          now: new Date("2026-09-15T00:00:00Z"),
          archiveRoot,
          fetchBookingOverviewMonth: overviewStub({ "2026-09": [6, 7, 8, 9].map(record) }),
          fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
        }),
      /mass-removal threshold/
    );
    assert.deepEqual(await snapshotTree(archiveRoot), stateBefore);

    // An empty window is never legitimate, so it must abort even when the window
    // just shifted — otherwise the rollover exemption would be a hole big enough
    // to wipe the whole archive.
    await assert.rejects(
      () =>
        runSync({
          now: new Date("2026-10-01T00:00:00Z"),
          archiveRoot,
          fetchBookingOverviewMonth: overviewStub({}),
          fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
        }),
      /returned zero bookings/
    );
    assert.deepEqual(await snapshotTree(archiveRoot), stateBefore);
  });
}

// I5: a rotated slug must not leave orphaned customer PII behind.
{
  await withTempRoot(async (archiveRoot) => {
    const detailsDir = path.join(archiveRoot, "archive/customer-portal-detail-snapshot/details");

    await runSync({
      now: new Date("2026-08-15T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: overviewStub({
        "2026-08": [{ booking_id: 1, customer_portal: "https://x/my-booking/slug-old", guest: "A" }],
      }),
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    assert.equal(await exists(path.join(detailsDir, "slug-old.raw.json")), true);

    const rotated = await runSync({
      now: new Date("2026-08-16T00:00:00Z"),
      archiveRoot,
      fetchBookingOverviewMonth: overviewStub({
        "2026-08": [{ booking_id: 1, customer_portal: "https://x/my-booking/slug-new", guest: "A" }],
      }),
      fetchCustomerPortalDetail: async (slug) => stubDetail(slug),
    });

    assert.deepEqual(rotated.diff.updated, ["1"], "the slug change must classify the booking as updated");
    assert.deepEqual(rotated.diff.removed, []);

    assert.equal(await exists(path.join(detailsDir, "slug-new.raw.json")), true);
    assert.equal(
      await exists(path.join(detailsDir, "slug-old.raw.json")),
      false,
      "the pre-rotation detail file must be pruned"
    );
  });
}

console.log("sync-booking-data.test.mjs: all assertions passed");
