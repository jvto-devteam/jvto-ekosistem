import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadGeneratorContext } from "./lib/booking-sync/generators/context.mjs";
import { generateBookingRecords } from "./lib/booking-sync/generators/booking-records.mjs";

export const GENERATORS = [
  { outputPath: "3-booking-and-journey-core/booking/booking-records.json", generate: generateBookingRecords },
];

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
