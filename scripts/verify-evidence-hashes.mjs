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
 * Covers two sets: credentials that publish a documentUrl + sha256, and every
 * entry in the assets inventory. The inventory was NOT covered by the first
 * version, which still stamped all 44 entries — a date asserting a check that
 * never ran. Thirteen of them turned out to hold hashes that no longer matched
 * their file.
 *
 * What "verified" means here, stated plainly so the date is not overclaimed:
 * the bytes served still hash to the value published beside them.
 * That proves the file has not been swapped or altered since it was recorded.
 * It does NOT prove the NIB is still active, the SIP still valid, or the SPRIN
 * still in force — those are registry questions no hash can answer.
 *
 *   node scripts/verify-evidence-hashes.mjs             # check only
 *   node scripts/verify-evidence-hashes.mjs --write     # stamp what verified
 *   node scripts/verify-evidence-hashes.mjs --write --restamp
 *       also records current hashes for inventory files that changed. Use only
 *       after confirming the change was legitimate — a mismatch can equally
 *       mean a document was altered.
 */
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
// Where jvto-web is checked out. Locally that is the sibling directory; in CI it
// cannot be, because actions/checkout refuses any `path` outside $GITHUB_WORKSPACE
// ("Repository path ... is not under ...", which is how the weekly job died on
// 2026-08-24). The workflow checks jvto-web out into a subdirectory instead and
// points this at it via JVTO_WEB_PATH.
const WEB_ROOT = process.env.JVTO_WEB_PATH
  ? path.resolve(ROOT, process.env.JVTO_WEB_PATH)
  : path.resolve(ROOT, "..", "jvto-web");
const WEB_PUBLIC = path.join(WEB_ROOT, "public");
const SITE = "https://javavolcano-touroperator.com";
const WRITE = process.argv.includes("--write");
// Records current hashes for inventory entries whose file legitimately changed.
const RESTAMP = process.argv.includes("--restamp");
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

/**
 * Fall back to hashing what the site actually serves.
 *
 * Some evidence lives only on the server — the KTA card scans under /uploads/
 * are served 200 but are not committed to jvto-web. Without this they came back
 * "unresolved" and silently kept whatever date they already had, which is the
 * same overclaiming this script exists to stop, just quieter. Hashing the served
 * bytes is also the stronger check: it is what a reader downloads.
 */
async function hashServed(relative) {
  try {
    const response = await fetch(`${SITE}/${relative}`, { redirect: "follow" });
    if (!response.ok) return null;
    const buf = Buffer.from(await response.arrayBuffer());
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

/** Local first (fast, offline-capable), then the live URL. */
async function hashAsset(relative) {
  return (await hashLocal(relative)) ?? (await hashServed(relative));
}

async function main() {
  let ok = 0;
  const mismatched = [];
  const assetMismatches = [];
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

  // The documents live in jvto-web. If that checkout is not where we expect,
  // every hash below reports "not found", `verified` lands on 0, and the run
  // used to exit 0 anyway — so `--write` would stamp last_verified_iso to today
  // having verified nothing. That is the precise failure this script exists to
  // prevent, so refuse before reaching the counters.
  try {
    await stat(WEB_PUBLIC);
  } catch {
    console.error(
      `jvto-web is not at ${WEB_PUBLIC}.\n` +
        `Set JVTO_WEB_PATH to the checkout (CI does: JVTO_WEB_PATH=.jvto-web), ` +
        `or clone jvto-web beside this repo. Refusing to report on documents it cannot read.`,
    );
    process.exit(1);
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

  // An unreachable document was printed but never failed the run. A documentUrl
  // this repo publishes and no file behind it is a 404 for every reader who
  // clicks "see the document" — the same broken promise as a wrong hash, and it
  // must not be stamped as verified either.
  if (unreachable.length) {
    console.error(
      `\n${unreachable.length} published document(s) have no file behind them. ` +
        `Either the file moved in jvto-web or the documentUrl is wrong; fix one of the two before stamping.`,
    );
    process.exit(1);
  }

  // ── assets_inventory ────────────────────────────────────────────────────
  // Checked separately because these entries carry `filename` + `preview`
  // rather than a documentUrl. They were NOT verified by the first version of
  // this script, which still stamped all 44 of them — a date asserting a check
  // that never ran, which is the exact failure this script exists to prevent.
  // Two files (the surat sehat specimen and its preview) had been replaced
  // since the inventory was written and their recorded hashes were stale.
  const inventoryPath = path.join(ROOT, INVENTORY);
  let inventory = null;
  const assetResults = new Map(); // filename -> "ok" | "mismatch" | "missing"
  try {
    inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  } catch (error) {
    console.error(`Could not read the inventory: ${error.message}`);
    process.exit(1);
  }

  for (const asset of inventory.assets_inventory ?? []) {
    if (!asset.sha256) continue;
    const relative = String(asset.preview ?? "").replace(/^\/+/, "");
    if (!relative) {
      assetResults.set(asset.filename, "missing");
      continue;
    }
    const actual = await hashAsset(relative);
    if (actual === null) {
      assetResults.set(asset.filename, "missing");
    } else if (actual.toLowerCase() === String(asset.sha256).toLowerCase()) {
      assetResults.set(asset.filename, "ok");
    } else {
      assetResults.set(asset.filename, "mismatch");
      assetMismatches.push(
        `${asset.filename}\n      recorded ${String(asset.sha256).toLowerCase()}\n      actual   ${actual}`,
      );
    }
  }

  const assetOk = [...assetResults.values()].filter((v) => v === "ok").length;
  const assetMissing = [...assetResults.values()].filter((v) => v === "missing").length;
  console.log(`  inventory verified   : ${assetOk}`);
  console.log(`  inventory mismatched : ${assetMismatches.length}`);
  console.log(`  inventory unresolved : ${assetMissing}`);
  for (const failure of assetMismatches) console.error(`    ! ${failure}`);

  if (assetMismatches.length && !RESTAMP) {
    console.error(
      "\nInventory hashes do not match the files on disk. Re-run with --restamp to\n" +
      "record the current hashes, but only after confirming the files changed for a\n" +
      "legitimate reason — a mismatch can also mean a document was altered.",
    );
    process.exit(1);
  }

  if (!WRITE) {
    console.log("\n(dry run — pass --write to stamp last_verified_iso)");
    return;
  }

  // Only reached when every document still hashes to its published value, so
  // stamping the date asserts something that was actually re-established.
  try {
    let stamped = 0;
    let restamped = 0;
    for (const asset of inventory.assets_inventory ?? []) {
      if (!asset.sha256) continue;
      const result = assetResults.get(asset.filename);
      if (result === "ok") {
        // Only a file that actually re-hashed to its recorded value gets a date.
        asset.last_verified_iso = TODAY;
        stamped += 1;
      } else if (result === "mismatch" && RESTAMP) {
        const relative = String(asset.preview ?? "").replace(/^\/+/, "");
        const actual = await hashAsset(relative);
        if (actual) {
          asset.sha256 = actual.toUpperCase();
          try {
            const { size } = await stat(path.join(WEB_PUBLIC, relative));
            asset.size_bytes = size;
            asset.size_mb = Number((size / 1048576).toFixed(6));
          } catch {
            // Server-only asset: keep the recorded size rather than guessing.
          }
          asset.last_verified_iso = TODAY;
          restamped += 1;
        }
      } else {
        // Leave the old date alone. An unverified asset must not inherit today's.
        delete asset.last_hash_verification;
      }
    }
    inventory.last_hash_verification = TODAY;
    await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
    console.log(
      `\nStamped ${stamped} verified asset(s)` +
        (restamped ? `, recorded new hashes for ${restamped} changed file(s)` : "") +
        `. Unverified assets keep their previous date.`,
    );
  } catch (error) {
    console.error(`Could not update the inventory: ${error.message}`);
    process.exit(1);
  }
}

main();
