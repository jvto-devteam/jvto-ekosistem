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
