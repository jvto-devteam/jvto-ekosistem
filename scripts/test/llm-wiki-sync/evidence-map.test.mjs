import assert from "node:assert/strict";
import {
  EVIDENCE_ID_MAP,
  EVIDENCE_MAP_PROOFS,
  RESERVED_DOWNSTREAM_IDS,
  mapEvidenceId,
  mapEvidenceEntry,
  findUnmappedCollisions,
} from "../../lib/llm-wiki-sync/evidence-map.mjs";

// The three downstream-origin proof documents keep their downstream ids —
// handoff §4 requires the sync not to renumber E019/E020/E021.
{
  assert.equal(mapEvidenceId("E027"), "E019");
  assert.equal(mapEvidenceId("E028"), "E020");
  assert.equal(mapEvidenceId("E029"), "E021");
}

// The two upstream documents that reuse those numbers for different documents
// are moved aside, so no id ever denotes two documents in one file.
{
  assert.equal(mapEvidenceId("E019"), "E022", "upstream surat-sehat-sample must not land on the AHU decree");
  assert.equal(mapEvidenceId("E020"), "E023", "upstream TIMES press must not land on the SIP");
}

// Everything else passes through untouched.
{
  for (const id of ["E001", "E006", "E008", "E015", "E030", "E031"]) {
    assert.equal(mapEvidenceId(id), id, `${id} has no collision and must pass through`);
  }
}

// The map is injective: two upstream documents may never share a downstream id.
{
  const targets = Object.values(EVIDENCE_ID_MAP);
  assert.equal(
    new Set(targets).size,
    targets.length,
    "two upstream ids map to the same downstream id — that would overwrite a document"
  );
}

// Every reserved id is accounted for, and the free ids chosen (E022/E023) are
// not ids the downstream file already uses for something else.
{
  assert.deepEqual(
    [...RESERVED_DOWNSTREAM_IDS].sort(),
    ["E019", "E020", "E021", "E022", "E023"],
    "the reserved set drifted from the table"
  );
}

// Collision detection: a future upstream addition landing on a reserved id
// must abort the sync rather than silently overload the id.
{
  assert.deepEqual(findUnmappedCollisions(["E001", "E030"]), [], "non-colliding ids are fine");
  assert.deepEqual(findUnmappedCollisions(["E019", "E020"]), [], "mapped collisions are handled");
  assert.deepEqual(
    findUnmappedCollisions(["E022"]),
    ["E022"],
    "an unmapped upstream E022 would collide with the reassigned surat-sehat-sample"
  );
  assert.deepEqual(findUnmappedCollisions(["E021", "E021"]), ["E021"], "duplicates report once");
}

// mapEvidenceEntry rewrites only the id.
{
  const entry = {
    id: "E027",
    type: "official_authority",
    source_file: "wiki/credentials/legal-licenses.md",
    description: "Menkumham decree",
    proof_ids: ["ahu-0010187-ptjvr"],
  };
  const mapped = mapEvidenceEntry(entry);
  assert.equal(mapped.id, "E019");
  assert.equal(mapped.description, entry.description, "no other field may change");
  assert.deepEqual(mapped.proof_ids, entry.proof_ids, "proof_ids are upstream's and stay upstream's");
  assert.equal(entry.id, "E027", "the input must not be mutated");
}

// The documented proof_ids are the reason this table exists rather than a
// runtime join: two of the three pairs do not share a spelling. If upstream
// ever aligns them, this assertion is the signal that a join becomes possible.
{
  assert.equal(
    EVIDENCE_MAP_PROOFS.E027.upstreamProof,
    EVIDENCE_MAP_PROOFS.E027.downstreamProof,
    "E027/E019 is the one pair where proof_id joins"
  );
  assert.notEqual(
    EVIDENCE_MAP_PROOFS.E028.upstreamProof,
    EVIDENCE_MAP_PROOFS.E028.downstreamProof,
    "if these now match, proof_id joining is viable and the table can be revisited"
  );
  assert.notEqual(
    EVIDENCE_MAP_PROOFS.E029.upstreamProof,
    EVIDENCE_MAP_PROOFS.E029.downstreamProof,
    "if these now match, proof_id joining is viable and the table can be revisited"
  );
}

// Every row in the table is documented.
{
  for (const upstreamId of Object.keys(EVIDENCE_ID_MAP)) {
    const doc = EVIDENCE_MAP_PROOFS[upstreamId];
    assert.ok(doc, `${upstreamId} is mapped but undocumented in EVIDENCE_MAP_PROOFS`);
    assert.equal(doc.downstreamId, EVIDENCE_ID_MAP[upstreamId], `${upstreamId} documentation disagrees with the map`);
  }
}

console.log("evidence-map.test.mjs: all assertions passed");
