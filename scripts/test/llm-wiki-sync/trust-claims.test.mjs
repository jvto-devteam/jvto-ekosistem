import assert from "node:assert/strict";
import { generateTrustClaims } from "../../lib/llm-wiki-sync/generators/trust-claims.mjs";

function upstreamClaims() {
  return [
    {
      id: "C2",
      name: "Private Tours",
      canonical_text: "All tours are private.",
      last_verified: "2026-08-22",
      evidence: [
        {
          id: "E004",
          type: "structured_dataset",
          source_file: "wiki/products/packages-overview.md",
          description: "All 22 packages are private (dedicated vehicle + crew)",
          proof_ids: ["nib-1102230032918"],
        },
      ],
      derived_artifacts: [],
      narrative: { ai_snippet: "…", short: "…", cs_reply: "…" },
      decisions: [],
      tags: ["trust-signal"],
    },
    {
      id: "C5",
      name: "Proof-First Trust",
      canonical_text: "Every claim is document-backed.",
      last_verified: "2026-08-22",
      evidence: [
        { id: "E008", type: "official_authority", source_file: "a.md", description: "NIB/TDUP", proof_ids: ["nib-1102230032918"] },
        { id: "E027", type: "official_authority", source_file: "b.md", description: "AHU decree", proof_ids: ["ahu-0010187-ptjvr"] },
        { id: "E028", type: "official_authority", source_file: "c.md", description: "SIP", proof_ids: ["sip-dr-ahmad-irwandanu-2026"] },
        { id: "E029", type: "official_authority", source_file: "d.md", description: "SE.1658", proof_ids: ["bbksda-surat-edaran-se-1658-ksa-9-2024"] },
      ],
      derived_artifacts: [
        { id: "E017", type: "ai_generated", source_file: "e.md", description: "Dossier", built_from: ["nib-1102230032918"] },
      ],
      narrative: { ai_snippet: "…", short: "…", cs_reply: "…" },
      decisions: [{ decision_id: "DEC-005", topic: "founder_police_unit", final_value: { unit: "POLPAR Bondowoso" }, decided_at: "2026-08-22" }],
      tags: ["trust-signal"],
    },
    {
      id: "C8",
      name: "Partners as Context",
      canonical_text: "Partners are context, not endorsement.",
      last_verified: "2026-08-22",
      evidence: [{ id: "E012", type: "reputable_media", source_file: "f.md", description: "ISIC", proof_ids: ["isic"] }],
      derived_artifacts: [],
      narrative: { ai_snippet: "…", short: "…", cs_reply: "…" },
      decisions: [
        {
          decision_id: "DEC-002",
          topic: "founding_year_canonical",
          final_value: { marketing_founding_year: 2015, legal_incorporation_year: null, tdup_issued_year: 2023 },
          decided_at: "2026-08-03",
        },
      ],
      tags: ["trust-signal"],
    },
  ];
}

function downstreamPrevious() {
  return {
    _comment: "Downstream provenance note that upstream knows nothing about.",
    claims: [
      {
        id: "C2",
        evidence: [
          {
            id: "E004",
            description: "All {PACKAGE_COUNT} packages are private (dedicated vehicle + crew)",
            proof_ids: ["nib-1102230032918"],
          },
        ],
        derived_artifacts: null,
      },
      {
        id: "C5",
        evidence: [],
        derived_artifacts: [
          { id: "E017", kind: "verification_dossier", title: "JVTO verification dossier", description: "Dossier", source_file: "e.md" },
        ],
      },
      {
        id: "C8",
        evidence: [],
        derived_artifacts: null,
        decisions: [
          {
            decision_id: "DEC-002",
            topic: "founding_year_canonical",
            final_value: { marketing_founding_year: 2015, legal_incorporation_year: 2016, tdup_issued_year: 2023 },
            decided_at: "2026-05-28",
          },
        ],
      },
    ],
    aeoSnippets: [{ topic: "old", tldr: "old", claim_ids: ["C2"], use_for: [] }],
    faq: [{ question: "old", answer: "old", source_claim_id: "C2", target_pages: [] }],
  };
}

const aeoSnippets = [{ topic: "trust-signal", tldr: "fresh", claim_ids: ["C2"], use_for: ["llms.txt"] }];
const faq = [{ question: "fresh?", answer: "yes", source_claim_id: "C2", target_pages: ["output/website/pages/verify-jvto/"] }];

// Composition: the file is claims + aeoSnippets + faq, not claims alone.
// A whole-file overwrite from claims.json would delete the last two blocks.
{
  const { file } = generateTrustClaims({
    claims: upstreamClaims(),
    aeoSnippets,
    faq,
    previous: downstreamPrevious(),
  });

  assert.deepEqual(Object.keys(file), ["_comment", "claims", "aeoSnippets", "faq"]);
  assert.equal(file.aeoSnippets[0].tldr, "fresh", "aeoSnippets refresh from upstream");
  assert.equal(file.faq[0].answer, "yes", "faq refreshes from upstream");
  assert.equal(file.claims.length, 3);

  assert.equal("version" in file, false, "upstream envelope keys must not leak in");
  assert.equal("compiled_at" in file, false, "compiled_at would churn the file on every compile");
}

// The downstream _comment is provenance the sync must not overwrite.
{
  const previous = downstreamPrevious();
  const { file } = generateTrustClaims({ claims: upstreamClaims(), aeoSnippets, faq, previous });
  assert.equal(file._comment, previous._comment);
}

// Evidence ids are translated, so E019/E020/E021 keep meaning what they mean
// downstream and no id ends up denoting two documents.
{
  const { file } = generateTrustClaims({ claims: upstreamClaims(), aeoSnippets, faq, previous: downstreamPrevious() });
  const c5 = file.claims.find((c) => c.id === "C5");
  assert.deepEqual(c5.evidence.map((e) => e.id), ["E008", "E019", "E020", "E021"]);

  const ids = file.claims.flatMap((c) => c.evidence.map((e) => e.id));
  assert.equal(new Set(ids).size, ids.length, "no id may appear twice across the file");
}

// derived_artifacts keeps the downstream shape — upstream was changed to match
// ekosistem's 2026-08-21 reclassification, so downstream is authoritative here.
{
  const { file } = generateTrustClaims({ claims: upstreamClaims(), aeoSnippets, faq, previous: downstreamPrevious() });
  const c5 = file.claims.find((c) => c.id === "C5");
  assert.equal(c5.derived_artifacts[0].kind, "verification_dossier", "downstream kind/title survive");
  assert.equal("built_from" in c5.derived_artifacts[0], false, "upstream shape must not replace it");
}

// Frozen field: the published 2016 incorporation year is kept, and reported.
{
  const { file, conflicts } = generateTrustClaims({
    claims: upstreamClaims(),
    aeoSnippets,
    faq,
    previous: downstreamPrevious(),
  });
  const c8 = file.claims.find((c) => c.id === "C8");
  const dec002 = c8.decisions.find((d) => d.decision_id === "DEC-002");
  assert.equal(dec002.final_value.legal_incorporation_year, 2016, "the published claim must not be retracted by a sync");
  assert.equal(dec002.decided_at, "2026-08-03", "the rest of the decision still updates from upstream");

  const conflict = conflicts.find((c) => c.key === "legal_incorporation_year");
  assert.ok(conflict, "a frozen divergence must be reported, not silently absorbed");
  assert.equal(conflict.downstreamValue, 2016);
  assert.equal(conflict.upstreamValue, null);
  assert.equal(conflict.resolution, "kept downstream value");
}

// Frozen field: the {PACKAGE_COUNT} token is kept, and reported.
{
  const { file, conflicts } = generateTrustClaims({
    claims: upstreamClaims(),
    aeoSnippets,
    faq,
    previous: downstreamPrevious(),
  });
  const c2 = file.claims.find((c) => c.id === "C2");
  assert.match(c2.evidence[0].description, /\{PACKAGE_COUNT\}/);
  assert.ok(conflicts.find((c) => c.key === "package_count_token"));
}

// Real value of the sync: corrections that were empty downstream land.
{
  const { file } = generateTrustClaims({ claims: upstreamClaims(), aeoSnippets, faq, previous: downstreamPrevious() });
  const c5 = file.claims.find((c) => c.id === "C5");
  assert.equal(c5.decisions[0].decision_id, "DEC-005", "DEC-005 (POLPAR) fills a downstream gap");
  assert.equal(c5.last_verified, "2026-08-22", "last_verified advances");
}

// First sync with no downstream file: nothing to preserve, nothing to freeze.
{
  const { file, conflicts } = generateTrustClaims({ claims: upstreamClaims(), aeoSnippets, faq, previous: null });
  assert.equal("_comment" in file, false);
  assert.deepEqual(conflicts, []);
  assert.equal(file.claims.length, 3);
}

// Idempotence: composing twice from the same inputs is byte-identical, and
// re-composing over its own output changes nothing.
{
  const args = { claims: upstreamClaims(), aeoSnippets, faq, previous: downstreamPrevious() };
  const first = generateTrustClaims(args).file;
  const second = generateTrustClaims({ ...args, previous: first }).file;
  assert.equal(JSON.stringify(first), JSON.stringify(second), "a second run must not drift");
}

// An upstream id landing on a reassigned downstream id aborts the sync.
{
  const claims = upstreamClaims();
  claims[0].evidence.push({ id: "E022", type: "official_authority", source_file: "x.md", description: "new", proof_ids: ["x"] });
  assert.throws(
    () => generateTrustClaims({ claims, aeoSnippets, faq, previous: downstreamPrevious() }),
    /E022/,
    "an unmapped collision must fail loudly, not overload the id"
  );
}

console.log("trust-claims.test.mjs: all assertions passed");
