#!/usr/bin/env node
/**
 * verify-evidence-hashes.mjs
 *
 * Re-hashes every published evidence document and stamps the date it was
 * checked, so "last verified" stops being a claim nobody re-tests.
 *
 * The problem this solves. On 2026-08-20 the commercial layer was updating
 * daily while the trust layer read "Last audit 2026-05-12" and the oldest
 * asset date was 2025-12-02 — on pages whose whole premise is that the
 * verification is current. An auditor cannot tell "not verified since May"
 * apart from "verified constantly, date never updated", and had to assume the
 * worse of the two. Both readings are bad, and only automation removes the
 * ambiguity: if a machine re-checks weekly and writes the date it ran, the
 * date means something again.
 *
 * What "verified" means here, stated plainly so the date is not overclaimed:
 * the bytes served at documentUrl still hash to the value published beside it.
 * That proves the file has not been swapped or altered since it was recorded.
 * It does NOT prove the NIB is still active, the SIP still valid, or the SPRIN
 * still in force — those are registry questions no hash can answer.
 *
 *   node scripts/verify-evidence-hashes.mjs           # check only
 *   node scripts/verify-evidence-hashes.mjs --write   # check and stamp dates
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const WEB_PUBLIC = path.resolve(ROOT, "..", "jvto-web", "public");
const SITE = "https://javavolcano-touroperator.com";
const WRITE = process.argv.includes("--write");
const TODAY = new Date().toISOString().slice(0, 10);

const INVENTORY =
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/verify-jvto-assets-inventory.json";
const CREDENTIAL_SOURCES = [
  "1-knowledge-and-evidence-core/organization-identity/organization.json",
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/credentials.json",
  "1-knowledge-and-evidence-core/people-and-crew/people.json",
];

function collectPairs(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectPairs(item, out);
    return out;
  }
  if (node && typeof node === "object") {
    if (typeof node.documentUrl === "string" && typeof node.sha256 === "string") {
      out.push({
        url: node.documentUrl,
        sha256: node.sha256.toLowerCase(),
        name: node.name ?? "(unnamed)",
      });
    }
    for (const value of Object.values(node)) collectPairs(value, out);
  }
  return out;
}

async function hashLocal(relative) {
  try {
    const buf = await readFile(path.join(WEB_PUBLIC, relative));
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

async function main() {
  let ok = 0;
  const mismatched = [];
  const unreachable = [];

  for (const source of CREDENTIAL_SOURCES) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(path.join(ROOT, source), "utf8"));
    } catch {
      continue;
    }
    for (const pair of collectPairs(parsed)) {
      if (!pair.url.startsWith(SITE)) continue;
      const relative = pair.url.slice(SITE.length).replace(/^\/+/, "");
      const actual = await hashLocal(relative);
      if (actual === null) {
        unreachable.push(`${pair.name} — ${relative} not found`);
      } else if (actual === pair.sha256) {
        ok += 1;
      } else {
        mismatched.push(`${pair.name} — ${relative}\n      published ${pair.sha256}\n      actual    ${actual}`);
      }
    }
  }

  console.log(`Evidence hash check ${TODAY}`);
  console.log(`  verified   : ${ok}`);
  console.log(`  mismatched : ${mismatched.length}`);
  console.log(`  unreachable: ${unreachable.length}`);
  for (const note of unreachable) console.log(`    - ${note}`);
  for (const failure of mismatched) console.error(`    ! ${failure}`);

  if (mismatched.length) {
    console.error("\nA published hash no longer matches its file. Do not stamp dates until this is explained.");
    process.exit(1);
  }

  if (!WRITE) {
    console.log("\n(dry run — pass --write to stamp last_verified_iso)");
    return;
  }

  // Only reached when every document still hashes to its published value, so
  // stamping the date asserts something that was actually re-established.
  const inventoryPath = path.join(ROOT, INVENTORY);
  try {
    const raw = await readFile(inventoryPath, "utf8");
    const inventory = JSON.parse(raw);
    let stamped = 0;
    for (const asset of inventory.assets_inventory ?? []) {
      if (asset.sha256) {
        asset.last_verified_iso = TODAY;
        stamped += 1;
      }
    }
    inventory.last_hash_verification = TODAY;
    await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
    console.log(`\nStamped last_verified_iso = ${TODAY} on ${stamped} inventory asset(s).`);
  } catch (error) {
    console.error(`Could not update the inventory: ${error.message}`);
    process.exit(1);
  }
}

main();
