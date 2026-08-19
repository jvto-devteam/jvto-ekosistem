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
