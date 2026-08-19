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
