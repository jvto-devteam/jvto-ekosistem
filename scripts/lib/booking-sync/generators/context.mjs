import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { extractSlug } from "../manifest.mjs";

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

  // Drop orphaned detail files: an archived detail snapshot whose slug is no longer
  // reachable from the current overview is a booking that has left the system. Publishing
  // it would present a stale booking as active, with full crew/finance/itinerary data, in
  // every detail-sourced generator. `sync-booking-data.mjs` prunes such files on write, but
  // pre-prune drift already exists in the archive — filtering here keeps the whole generator
  // layer immune to it regardless of how the archive got into that state.
  const reachableSlugs = new Set(
    overviewRecords.map((record) => extractSlug(record.customer_portal)).filter(Boolean)
  );
  for (const slug of detailsBySlug.keys()) {
    if (!reachableSlugs.has(slug)) detailsBySlug.delete(slug);
  }

  return { overviewRecords, detailsBySlug };
}
