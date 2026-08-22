#!/usr/bin/env node
/**
 * backfill-crew-codes.mjs
 *
 * Applies the crew alias matcher to the WHOLE review corpus, not just newly
 * synced Google reviews.
 *
 * Why this is needed. sync-google-reviews.mjs assigns crewCodes only to the
 * reviews it fetches, so attribution was only ever applied going forward and
 * only on one platform. The corpus shows it: TripAdvisor has 0 of 21 reviews
 * tagged, Trustpilot 11 of 44, Google 87 of 152. A five-star Trustpilot review
 * reading "our guide Rendi and our driver Joyo" carried an empty crewCodes,
 * so neither of them got credit for it anywhere on the site.
 *
 * That matters beyond tidiness: the crew pages are built from these tags, and
 * "our crew are named in the reviews, they are not freelancers" is a claim the
 * site makes. Every untagged mention is evidence for that claim being thrown
 * away.
 *
 * The matcher is the same one the sync uses — same alias rules, same
 * word-boundary matching — so this adds no new inference, it only applies the
 * existing rule to records that predate it.
 *
 *   node scripts/backfill-crew-codes.mjs             # report only
 *   node scripts/backfill-crew-codes.mjs --write     # apply
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const REVIEWS_PATH = path.join(
  ROOT,
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json",
);
const PEOPLE_PATH = path.join(ROOT, "1-knowledge-and-evidence-core/people-and-crew/people.json");
const ALIAS_PATH = path.join(
  ROOT,
  "5-experience-engine/reviews/google-review-crew-alias-reconciliation.json",
);
const WRITE = process.argv.includes("--write");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildCrewMatcher() {
  const [peopleRaw, aliasRaw] = await Promise.all([
    readFile(PEOPLE_PATH, "utf8"),
    readFile(ALIAS_PATH, "utf8"),
  ]);
  const people = JSON.parse(peopleRaw);
  const aliasDoc = JSON.parse(aliasRaw);

  // Only crew still on the published roster. A name that no longer belongs to
  // anyone must not be guessed onto a review.
  // Index the roster under every form a rule might name it. The roster carries
  // "Boy (Ahboy)" while the alias rule says "Boy", so an exact-name lookup
  // silently dropped ALL of Boy's aliases and no review naming him could ever
  // be attributed by this matcher. A skipped rule looks identical to a rule for
  // departed crew, which is why it went unnoticed.
  const codeByLowerName = new Map();
  for (const member of people.crew?.roster ?? []) {
    const name = String(member.name ?? "");
    const forms = new Set([
      name.toLowerCase(),
      name.replace(/\s*\([^)]*\)\s*/g, " ").trim().toLowerCase(), // "Boy (Ahboy)" -> "boy"
      String(member.code ?? "").toLowerCase(),
    ]);
    for (const form of forms) {
      if (form) codeByLowerName.set(form, member.code);
    }
  }

  const rules = [];
  for (const rule of aliasDoc.aliasRules ?? []) {
    const code = codeByLowerName.get(rule.crewName.toLowerCase());
    if (!code) continue;
    for (const alias of rule.aliases ?? []) {
      rules.push({ alias, code, regex: new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i") });
    }
  }
  rules.sort((a, b) => b.alias.length - a.alias.length);
  return rules;
}

function matchCrewCodes(text, rules) {
  if (!text) return [];
  const found = new Set();
  for (const rule of rules) {
    if (rule.regex.test(text)) found.add(rule.code);
  }
  return [...found];
}

async function main() {
  const rules = await buildCrewMatcher();
  const doc = JSON.parse(await readFile(REVIEWS_PATH, "utf8"));

  const added = [];
  const perCrew = new Map();

  for (const review of doc.reviews ?? []) {
    const existing = new Set(review.crewCodes ?? []);
    const matched = matchCrewCodes(review.review, rules);
    const fresh = matched.filter((code) => !existing.has(code));
    if (!fresh.length) continue;

    added.push({ id: review.id, platform: review.platform, codes: fresh });
    for (const code of fresh) perCrew.set(code, (perCrew.get(code) ?? 0) + 1);
    // Union, never replacement: a code already recorded by hand stays, even if
    // the matcher would not have found it.
    review.crewCodes = [...existing, ...fresh];
  }

  console.log(`Reviews gaining an attribution: ${added.length}`);
  for (const [code, count] of [...perCrew].sort((a, b) => b[1] - a[1])) {
    console.log(`  +${String(count).padStart(3)}  ${code}`);
  }

  if (!WRITE) {
    console.log("\nSample of what would change:");
    for (const entry of added.slice(0, 8)) {
      console.log(`  #${entry.id} (${entry.platform}) -> ${entry.codes.join(", ")}`);
    }
    console.log("\n(dry run — pass --write to apply)");
    return;
  }

  await writeFile(REVIEWS_PATH, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${added.length} attribution(s) to reviews.json.`);
}

main();
