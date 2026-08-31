import { mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  fetchBookingOverviewMonth as defaultFetchBookingOverviewMonth,
  fetchCustomerPortalDetail as defaultFetchCustomerPortalDetail,
} from "./lib/booking-sync/fetch.mjs";
import { diffManifest, extractSlug } from "./lib/booking-sync/manifest.mjs";
import { runGenerators } from "./run-generators.mjs";
import { generateTouristTripSchemaOutputs } from "./generate-tourist-trip-schema.mjs";

// A single run may legitimately drop a few bookings (real cancellations), but a
// large fraction disappearing at once is far more likely to be a degraded
// upstream (auth change, filter regression, partial outage) than reality.
const MASS_REMOVAL_THRESHOLD = 0.3;
const DETAIL_FILE_SUFFIX = ".raw.json";
const DETAIL_FETCH_CONCURRENCY = 5;

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

async function mapWithConcurrency(items, worker, limit = 4) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
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
  const previousReport = await readJsonIfExists(path.join(overviewDir, "sync-report.json"), null);
  const previousPortalManifest = await readJsonIfExists(path.join(portalDir, "fetch-manifest.json"), { results: [] });
  const previousBySlug = new Map(previousPortalManifest.results.map((r) => [r.slug, r]));

  const diff = diffManifest(previousManifest, records);

  // The fetch window is a rolling two months, so at every UTC month rollover the
  // whole departing month leaves the window at once — a legitimate, expected
  // mass removal that must not be mistaken for a degraded upstream. Detect the
  // shift by comparing this run's window against the window recorded by the
  // previous run's sync-report.json (no new state file needed). A missing or
  // malformed previous report is treated as "same window", i.e. fully guarded —
  // failing loudly is the safe direction.
  const fetchWindow = [currentMonth, nextMonth];
  const previousWindow = Array.isArray(previousReport?.months) ? previousReport.months : null;
  const windowShifted = previousWindow !== null && previousWindow.join(",") !== fetchWindow.join(",");

  // Guard against a degraded upstream wiping the archive. Runs before any detail
  // fetch and before any write, in dry-run too — surfacing this is exactly what
  // a dry-run is for.
  const previousCount = Object.keys(previousManifest).length;

  // An empty two-month window while bookings were previously known is never
  // legitimate — the new window still contains the month that was current last
  // run — so this check applies even across a window shift.
  if (previousCount > 0 && records.length === 0) {
    throw new Error(
      `booking-sync aborted: the booking-overview fetch for ${fetchWindow.join(" + ")} returned zero ` +
        `bookings while ${previousCount} booking(s) were known from the previous run. An empty window ` +
        `is never legitimate at this scale — this means an upstream outage, auth change, or ` +
        `API/filter change. Nothing was fetched or written; re-run once the endpoint is healthy.`
    );
  }

  if (previousCount > 0 && !windowShifted && diff.removed.length > previousCount * MASS_REMOVAL_THRESHOLD) {
    throw new Error(
      `booking-sync aborted: ${diff.removed.length} of ${previousCount} previously known booking(s) ` +
        `disappeared from this booking-overview fetch, above the ` +
        `${Math.round(MASS_REMOVAL_THRESHOLD * 100)}% mass-removal threshold, with the fetch window ` +
        `unchanged at ${fetchWindow.join(" + ")}. This almost certainly means an upstream outage, ` +
        `auth change, or API/filter change — not that many real cancellations. Nothing was fetched ` +
        `or written; re-run once the endpoint is healthy.`
    );
  }

  const detailEntries = await mapWithConcurrency(
    [...diff.added, ...diff.updated],
    async (bookingId) => {
      const slug = diff.manifest[bookingId]?.slug;
      if (!slug) return null;
      const detail = await fetchCustomerPortalDetail(slug);
      return { bookingId, slug, detail };
    },
    DETAIL_FETCH_CONCURRENCY,
  );

  const detailResults = detailEntries
    .filter(Boolean)
    .map((entry) => entry.detail);

  const failedDetailBookingIds = detailEntries
    .filter((entry) => entry && !entry.detail.ok)
    .map((entry) => entry.bookingId);
  const failedDetailSlugs = detailEntries
    .filter((entry) => entry && !entry.detail.ok)
    .map((entry) => entry.slug);

  const report = {
    generatedAt: now.toISOString(),
    months: fetchWindow,
    added: diff.added,
    removed: diff.removed,
    updated: diff.updated,
    unchangedCount: diff.unchanged.length,
    failedDetailFetches: failedDetailSlugs,
  };

  const hasChanges = diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0;

  // A run with nothing to sync must leave the working tree byte-identical, so
  // the workflow's git-status check finds nothing and no empty commit is made.
  if (dryRun || !hasChanges) {
    return { diff, report, detailResults };
  }

  // Bookings whose detail fetch failed are deliberately left out of the
  // persisted sync-manifest.json: next run diffManifest sees them as absent
  // from the previous manifest, classifies them `added`, and retries the
  // fetch. diff.manifest itself stays intact — fetch-manifest.json below still
  // needs its slugs, including an honest failed entry for those bookings.
  const persistedManifest = { ...diff.manifest };
  for (const bookingId of failedDetailBookingIds) {
    delete persistedManifest[bookingId];
  }

  await mkdir(overviewDir, { recursive: true });
  await mkdir(portalDetailsDir, { recursive: true });

  await writeFile(path.join(overviewDir, "booking-overview.raw.json"), JSON.stringify(records, null, 2) + "\n");
  await writeFile(path.join(overviewDir, "headers.txt"), currentResult.headers + "\n");

  // Detail files land before sync-manifest.json: nothing may claim a booking
  // is current until its detail file is actually on disk.
  for (const detail of detailResults) {
    // A failed fetch must never overwrite an existing (possibly stale but
    // real) detail file with an error payload.
    if (!detail.ok) continue;
    await writeFile(
      path.join(portalDetailsDir, `${detail.slug}${DETAIL_FILE_SUFFIX}`),
      JSON.stringify({ slug: detail.slug, url: detail.url, statusCode: detail.statusCode, ok: detail.ok, json: detail.json }, null, 2) + "\n"
    );
  }

  for (const bookingId of diff.removed) {
    const slug = previousManifest[bookingId]?.slug;
    if (slug) {
      await rm(path.join(portalDetailsDir, `${slug}${DETAIL_FILE_SUFFIX}`), { force: true });
    }
  }

  // Prune any detail file whose slug is absent from the current fetch entirely
  // (slug rotation, or drift that never went through diff.removed) — stale
  // customer PII must not linger in the repo. A booking still present in
  // `records` keeps its file even if its detail fetch failed this run.
  const currentSlugs = new Set(records.map((record) => extractSlug(record.customer_portal)).filter(Boolean));
  for (const entry of await readdir(portalDetailsDir)) {
    if (!entry.endsWith(DETAIL_FILE_SUFFIX)) continue;
    const slug = entry.slice(0, -DETAIL_FILE_SUFFIX.length);
    if (!currentSlugs.has(slug)) {
      await rm(path.join(portalDetailsDir, entry), { force: true });
    }
  }

  await writeFile(path.join(overviewDir, "sync-manifest.json"), JSON.stringify(persistedManifest, null, 2) + "\n");
  await writeFile(path.join(overviewDir, "sync-report.json"), JSON.stringify(report, null, 2) + "\n");

  const detailBySlug = new Map(detailResults.map((detail) => [detail.slug, detail]));
  const manifestEntries = [...diff.added, ...diff.updated, ...diff.unchanged].map((bookingId) => {
    const slug = diff.manifest[bookingId].slug;
    const fresh = detailBySlug.get(slug);
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

  await runGenerators({ archiveRoot });
  await generateTouristTripSchemaOutputs({ archiveRoot });

  return { diff, report, detailResults };
}

const isMainModule = path.resolve(process.argv[1] ?? "") === path.resolve(new URL(import.meta.url).pathname);
if (isMainModule) {
  const dryRun = process.argv.includes("--dry-run");
  const result = await runSync({ dryRun });
  console.log(JSON.stringify(result.report, null, 2));
  if (dryRun) {
    console.log(`[dry-run] would fetch/keep ${result.detailResults.length} customer-portal detail(s); no files written.`);
  } else if (result.report.added.length === 0 && result.report.removed.length === 0 && result.report.updated.length === 0) {
    console.log("No added/removed/updated bookings; nothing written.");
  }
  if (result.report.failedDetailFetches.length > 0) {
    console.warn(
      `[warn] ${result.report.failedDetailFetches.length} customer-portal detail fetch(es) failed and will be retried next run: ${result.report.failedDetailFetches.join(", ")}`
    );
  }
}

