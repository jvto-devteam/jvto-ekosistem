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
      assert.equal(result.written.length, originalLength + 1, "must write one output per registered generator, including any real ones already present");
      assert.equal(result.written[result.written.length - 1], "some/nested/dir/test-output.json", "the temp test entry must be the last one written");

      const written = JSON.parse(await readFile(path.join(archiveRoot, "some/nested/dir/test-output.json"), "utf8"));
      assert.deepEqual(written, { count: 1 });
    } finally {
      GENERATORS.length = originalLength;
    }
  });
}

console.log("run-generators.test.mjs: all assertions passed");
