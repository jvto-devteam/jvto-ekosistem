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
