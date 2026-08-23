/**
 * Upstream → downstream evidence id translation.
 *
 * The handoff plan says "Match by `proof_id`, never by evidence id". Checked
 * against the data, that instruction cannot be carried out: only one of the
 * three documented pairs shares a proof_id spelling.
 *
 *   downstream E019 / upstream E027  ahu-0010187-ptjvr          == ahu-0010187-ptjvr           match
 *   downstream E020 / upstream E028  sip-ahmad-irwandanu-2026   != sip-dr-ahmad-irwandanu-2026 no match
 *   downstream E021 / upstream E029  bbksda-se-1658-2024        != bbksda-surat-edaran-se-1658-ksa-9-2024
 *
 * So the mapping is an explicit committed table instead of a runtime join, and
 * evidence-map.test.mjs asserts every row still resolves to the document it
 * claims on both sides. If either repo renumbers or re-slugs, that test fails
 * loudly rather than silently corrupting the downstream record.
 *
 * Two further rows exist because upstream E019/E020 are *different documents*
 * that happen to reuse ids already meaning something else downstream. Writing
 * them through untranslated would make one id denote two documents in one file.
 * They are assigned the next free downstream ids (E022, E023); downstream ids
 * only ever appear in trust-claims.json and verify-jvto-assets-inventory.json,
 * so nothing published depends on the numbering.
 */
export const EVIDENCE_ID_MAP = Object.freeze({
  // Three downstream-origin proof documents that upstream absorbed as E027-E029.
  // The downstream ids are canonical and must survive the sync (handoff §4).
  E027: "E019", // Menkumham decree AHU-0010187.AH.01.01.TAHUN 2023
  E028: "E020", // SIP dr. Ahmad Irwandanu, publicly downloadable
  E029: "E021", // BBKSDA SE.1658/K2/BIDTEK.1/KSA/9/2024

  // Upstream documents whose ids collide with the three above.
  E019: "E022", // surat sehat sample under C4
  E020: "E023", // TIMES Indonesia press, 2024-01-05
});

/**
 * What each mapped id is expected to point at, on each side. Purely for the
 * test to verify the table against live data — the generator does not read it.
 */
export const EVIDENCE_MAP_PROOFS = Object.freeze({
  E027: { downstreamId: "E019", upstreamProof: "ahu-0010187-ptjvr", downstreamProof: "ahu-0010187-ptjvr" },
  E028: { downstreamId: "E020", upstreamProof: "sip-dr-ahmad-irwandanu-2026", downstreamProof: "sip-ahmad-irwandanu-2026" },
  E029: { downstreamId: "E021", upstreamProof: "bbksda-surat-edaran-se-1658-ksa-9-2024", downstreamProof: "bbksda-se-1658-2024" },
  E019: { downstreamId: "E022", upstreamProof: "surat-sehat-sample", downstreamProof: null },
  E020: { downstreamId: "E023", upstreamProof: "press-times-ijen-suket-wajib-2024-01-05", downstreamProof: null },
});

/** Downstream ids that the table hands out. Nothing else may claim them. */
export const RESERVED_DOWNSTREAM_IDS = Object.freeze(Object.values(EVIDENCE_ID_MAP));

/** Translate one upstream evidence id. Unmapped ids pass through unchanged. */
export function mapEvidenceId(upstreamId) {
  return EVIDENCE_ID_MAP[upstreamId] ?? upstreamId;
}

/**
 * Upstream ids that would land on a downstream id the table has already
 * reassigned to a different document. The generator calls this so a future
 * upstream addition fails the sync loudly instead of quietly overloading an id.
 */
export function findUnmappedCollisions(upstreamIds) {
  const reserved = new Set(RESERVED_DOWNSTREAM_IDS);
  return [...new Set(upstreamIds)].filter(
    (id) => !(id in EVIDENCE_ID_MAP) && reserved.has(id)
  );
}

export function mapEvidenceEntry(entry) {
  return { ...entry, id: mapEvidenceId(entry.id) };
}
