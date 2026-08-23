import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { TRUST_CLAIMS_PATH } from "../../lib/llm-wiki-sync/run-generators.mjs";

/**
 * The checks handoff §4 requires after a real sync, run against the file that
 * is actually committed. Upstream's verify_claims.py scans only .md and .txt,
 * so nothing else lints this JSON at all.
 */

const file = JSON.parse(await readFile(path.join(process.cwd(), TRUST_CLAIMS_PATH), "utf8"));

// Terms retired by DEC-004 and DEC-005. They remain legitimate inside the
// decision records that document *what was replaced* — a historical record is
// correct as a record; only a present-tense assertion is a regression.
const RETIRED_TERMS = ["Ditpamobvit", "SE.1658/KSA.9/2024"];
const HISTORICAL_FIELDS = new Set(["superseded_unit", "superseded_number", "superseded_by", "previous_value"]);

function findCurrentAssertions(node, keyPath = "$", key = null, hits = []) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => findCurrentAssertions(v, `${keyPath}[${i}]`, key, hits));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) findCurrentAssertions(v, `${keyPath}.${k}`, k, hits);
  } else if (typeof node === "string" && !HISTORICAL_FIELDS.has(key)) {
    for (const term of RETIRED_TERMS) {
      if (node.includes(term)) hits.push({ term, keyPath });
    }
  }
  return hits;
}

// Retired facts must not reappear as present-tense claims.
{
  const hits = findCurrentAssertions(file);
  assert.deepEqual(
    hits,
    [],
    `retired terms asserted as current fact: ${hits.map((h) => `${h.term} at ${h.keyPath}`).join(", ")}`
  );
}

// …but the decision records that document the correction must survive, or the
// audit trail explaining why the value changed is gone.
{
  const decisions = file.claims.flatMap((c) => c.decisions ?? []);
  const dec004 = decisions.find((d) => d.decision_id === "DEC-004");
  const dec005 = decisions.find((d) => d.decision_id === "DEC-005");

  assert.ok(dec004, "DEC-004 (BBKSDA circular number) must be present");
  assert.equal(dec004.final_value.canonical_number, "SE.1658/K2/BIDTEK.1/KSA/9/2024");
  assert.equal(dec004.final_value.superseded_number, "SE.1658/KSA.9/2024", "the audit trail must record what was replaced");

  assert.ok(dec005, "DEC-005 (founder police unit) must be present");
  assert.match(dec005.final_value.unit, /POLPAR/);
  assert.match(dec005.final_value.superseded_unit, /Ditpamobvit/, "the audit trail must record what was replaced");
}

// Downstream evidence ids must keep pointing at the downstream documents.
{
  const proofs = new Map();
  for (const claim of file.claims) {
    for (const e of claim.evidence ?? []) proofs.set(e.id, e.proof_ids ?? []);
  }

  assert.deepEqual(proofs.get("E019"), ["ahu-0010187-ptjvr"], "E019 must remain the Menkumham decree");
  assert.deepEqual(proofs.get("E020"), ["sip-dr-ahmad-irwandanu-2026"], "E020 must remain the doctor's SIP");
  assert.deepEqual(proofs.get("E021"), ["bbksda-surat-edaran-se-1658-ksa-9-2024"], "E021 must remain the BBKSDA circular");

  const allIds = file.claims.flatMap((c) => (c.evidence ?? []).map((e) => e.id));
  assert.equal(new Set(allIds).size, allIds.length, "an evidence id must never denote two documents");
}

// The composed blocks a whole-file overwrite would have deleted.
{
  assert.equal(file.claims.length, 9);
  assert.equal(file.aeoSnippets.length, 9, "aeoSnippets[] must survive the sync");
  assert.equal(file.faq.length, 9, "faq[] must survive the sync");
  assert.ok(file._comment, "downstream provenance note must survive");
  assert.ok(
    file.claims.some((c) => (c.derived_artifacts ?? []).length > 0),
    "derived_artifacts[] must survive the sync"
  );
}

// Frozen fields: both are published copy and only the owner may change them.
{
  const c8 = file.claims.find((c) => c.id === "C8");
  const dec002 = (c8.decisions ?? []).find((d) => d.decision_id === "DEC-002");
  assert.equal(
    dec002.final_value.legal_incorporation_year,
    2016,
    "the published 2016 incorporation year must not be retracted by a sync"
  );

  const c2 = file.claims.find((c) => c.id === "C2");
  assert.ok(
    (c2.evidence ?? []).some((e) => (e.description ?? "").includes("{PACKAGE_COUNT}")),
    "the {PACKAGE_COUNT} token must stay frozen until the owner decides"
  );
}

console.log("anti-regression.test.mjs: all assertions passed");
