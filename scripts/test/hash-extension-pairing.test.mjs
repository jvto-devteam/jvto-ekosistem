#!/usr/bin/env node
/**
 * hash-extension-pairing.test.mjs
 *
 * Guards the proof chain against the one failure it cannot survive quietly:
 * publishing a documentUrl next to the hash of a DIFFERENT file.
 *
 * Background. Until 2026-08-21 the SPRIN WAL-TRAVEL credential published the
 * URL of the .webp preview alongside the SHA-256 of the .pdf. Anyone who
 * downloaded the linked file and hashed it — exactly what a proof library
 * invites people to do — got a mismatch and had every reason to conclude the
 * evidence had been altered. Nothing had: all five hashes were correct at
 * source, and public/legal/manifest.csv recorded both files correctly. Only
 * the publication layer paired them wrongly.
 *
 * So the invariant is not "the hash is right", it is "the hash belongs to the
 * file the URL points at". This test asserts that for every credential that
 * publishes both, by hashing the real file on disk.
 *
 * Run: node scripts/test/hash-extension-pairing.test.mjs
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const WEB_PUBLIC = path.resolve(ROOT, "..", "jvto-web", "public");
const SITE = "https://javavolcano-touroperator.com";

const SOURCES = [
  "1-knowledge-and-evidence-core/organization-identity/organization.json",
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/credentials.json",
  "1-knowledge-and-evidence-core/people-and-crew/people.json",
];

/** Every {documentUrl, sha256} pair anywhere in a JSON tree. */
function collectPairs(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectPairs(item, out);
    return out;
  }
  if (node && typeof node === "object") {
    const url = node.documentUrl;
    const sha = node.sha256;
    if (typeof url === "string" && typeof sha === "string") {
      out.push({ url, sha256: sha.toLowerCase(), name: node.name ?? "(unnamed)" });
    }
    for (const value of Object.values(node)) collectPairs(value, out);
  }
  return out;
}

async function sha256Of(filePath) {
  try {
    return createHash("sha256").update(await readFile(filePath)).digest("hex");
  } catch {
    return null;
  }
}

async function main() {
  const failures = [];
  const skipped = [];
  let checked = 0;

  for (const source of SOURCES) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(path.join(ROOT, source), "utf8"));
    } catch (error) {
      failures.push(`${source}: unreadable (${error.message})`);
      continue;
    }

    for (const pair of collectPairs(parsed)) {
      if (!pair.url.startsWith(SITE)) {
        skipped.push(`${pair.name}: off-site documentUrl ${pair.url}`);
        continue;
      }
      const relative = pair.url.slice(SITE.length).replace(/^\/+/, "");
      const onDisk = path.join(WEB_PUBLIC, relative);
      const actual = await sha256Of(onDisk);

      if (actual === null) {
        // The sibling repo may not be checked out beside this one (CI runs
        // ekosistem alone). Report, don't fail — a missing checkout is not a
        // broken proof chain.
        skipped.push(`${pair.name}: ${relative} not found under jvto-web/public`);
        continue;
      }

      checked += 1;
      if (actual !== pair.sha256) {
        const ext = path.extname(relative);
        failures.push(
          `${pair.name}\n` +
            `      documentUrl : ${relative} (${ext})\n` +
            `      published   : ${pair.sha256}\n` +
            `      actual      : ${actual}\n` +
            `      -> the published hash does not belong to the linked file`,
        );
      }
    }
  }

  for (const note of skipped) console.log(`  skipped: ${note}`);

  if (failures.length) {
    console.error(`\nhash-extension-pairing.test.mjs: ${failures.length} mismatch(es)`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log(
    `hash-extension-pairing.test.mjs: all assertions passed (${checked} credential document(s) verified against the file on disk)`,
  );
}

main();
