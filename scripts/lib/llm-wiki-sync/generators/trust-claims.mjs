import { mapEvidenceEntry, findUnmappedCollisions } from "../evidence-map.mjs";

/**
 * Fields the sync must never take from upstream, with the reason each is
 * frozen. Owner decision 2026-08-23: both change the meaning of copy that is
 * already published, so they hold their downstream value and the sync reports
 * the conflict instead of resolving it.
 */
const FROZEN_FIELDS = Object.freeze([
  {
    key: "legal_incorporation_year",
    claimId: "C8",
    locate: (claim) => claim.decisions?.find((d) => d.decision_id === "DEC-002")?.final_value,
    field: "legal_incorporation_year",
    reason:
      "Downstream asserts 2016 on three published pages (verify-jvto, history-artifacts, legal); upstream DEC-002 now carries null. Adopting upstream would retract a published legal claim.",
  },
  {
    key: "package_count_token",
    claimId: "C2",
    locate: (claim) => claim.evidence?.find((e) => e.id === "E004"),
    field: "description",
    reason:
      "Downstream stores the {PACKAGE_COUNT} token, upstream a literal count. This repo has no interpolation step, so changing it alters published copy either way.",
  },
]);

/**
 * Compose trust-claims.json.
 *
 * Downstream trust-claims.json is not a copy of upstream claims.json — it is
 * claims + aeo-snippets + faq in one file (handoff §3). A whole-file overwrite
 * from claims.json alone would delete the aeoSnippets[] and faq[] blocks.
 *
 * `previous` is the current downstream file, and it is authoritative for:
 *   - `_comment`, which records downstream provenance upstream knows nothing of
 *   - `derived_artifacts`, whose downstream shape ({id,kind,title,...}) is the
 *     one upstream was changed to match in the 2026-08-21 reclassification
 *   - the two frozen fields above
 */
export function generateTrustClaims({ claims, aeoSnippets, faq, previous }) {
  const previousClaims = new Map((previous?.claims ?? []).map((c) => [c.id, c]));

  const upstreamEvidenceIds = claims.flatMap((c) => (c.evidence ?? []).map((e) => e.id));
  const untranslated = findUnmappedCollisions(upstreamEvidenceIds);
  if (untranslated.length > 0) {
    throw new Error(
      `llm-wiki sync aborted: upstream evidence ids ${untranslated.join(", ")} collide with downstream ids that mean different documents, and evidence-map.mjs has no row for them. Add the mapping before syncing.`
    );
  }

  const conflicts = [];

  const composedClaims = claims.map((claim) => {
    const prior = previousClaims.get(claim.id);

    const composed = {
      ...claim,
      evidence: (claim.evidence ?? []).map(mapEvidenceEntry),
      // Downstream owns the shape here; keep its array untouched rather than
      // rewriting {id,kind,title} entries into upstream's {id,type,built_from}.
      derived_artifacts: prior ? prior.derived_artifacts : (claim.derived_artifacts ?? []),
    };

    for (const frozen of FROZEN_FIELDS) {
      if (frozen.claimId !== claim.id || !prior) continue;
      const priorHost = frozen.locate(prior);
      const nextHost = frozen.locate(composed);
      if (!priorHost || !nextHost) continue;

      const downstreamValue = priorHost[frozen.field];
      const upstreamValue = nextHost[frozen.field];
      if (JSON.stringify(downstreamValue) !== JSON.stringify(upstreamValue)) {
        conflicts.push({
          key: frozen.key,
          claimId: frozen.claimId,
          field: frozen.field,
          downstreamValue,
          upstreamValue,
          resolution: "kept downstream value",
          reason: frozen.reason,
        });
      }
      nextHost[frozen.field] = downstreamValue;
    }

    return composed;
  });

  const file = {
    ...(previous?._comment ? { _comment: previous._comment } : {}),
    claims: composedClaims,
    aeoSnippets,
    faq,
  };

  return { file, conflicts };
}
