import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { buildAggregateRating, buildOrganizationNode } from "../lib/build-organization.mjs";

async function withTempRoot(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "build-organization-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const ORG_FIXTURE = {
  brandName: "Java Volcano Tour Operator",
  legalName: "PT Java Volcano Rendezvous",
  shortName: "JVTO",
  websiteUrl: "https://javavolcano-touroperator.com",
  telephone: "+6282244788833",
  email: "hello@javavolcano-touroperator.com",
  foundingDate: "2015",
  slogan: "Private volcano tours with police-led safety.",
};

// loadExternalEntities() caches its parsed registry at module scope (by design —
// see external-entities.mjs), so only the FIRST temp root's external-entities.json
// in this process is ever actually read. Every fixture below writes the same
// trivial `{records: []}` content, so this is safe; it would NOT be safe if a
// test case needed different registry content per root.
async function writeFixtures(root, { reviewPlatforms } = {}) {
  const orgDir = path.join(root, "1-knowledge-and-evidence-core/organization-identity");
  const evidenceDir = path.join(root, "1-knowledge-and-evidence-core/credentials-and-public-evidence");
  await mkdir(orgDir, { recursive: true });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(orgDir, "organization.json"), JSON.stringify(ORG_FIXTURE));
  await writeFile(path.join(orgDir, "external-entities.json"), JSON.stringify({ records: [] }));
  if (reviewPlatforms !== undefined) {
    await writeFile(
      path.join(evidenceDir, "review-platforms.json"),
      JSON.stringify(reviewPlatforms)
    );
  }
}

// ── buildAggregateRating() — pure, no fs ────────────────────────────────────

{
  const node = buildAggregateRating([
    { platform: "Trustpilot", rating: 4.8, reviewCount: 51 },
    { platform: "Google Maps", rating: 4.9, reviewCount: 152 },
  ]);
  assert.deepEqual(node, { "@type": "AggregateRating", ratingValue: 4.9, reviewCount: 152, bestRating: 5 });
}

{
  // Google Maps entry missing entirely — must not throw, must return null.
  const node = buildAggregateRating([{ platform: "Trustpilot", rating: 4.8, reviewCount: 51 }]);
  assert.equal(node, null);
}

{
  // Google Maps entry present but null (matches review-platforms.json's real shape for
  // an unverified platform, e.g. its current GetYourGuide entry).
  const node = buildAggregateRating([{ platform: "Google Maps", rating: null, reviewCount: null }]);
  assert.equal(node, null);
}

{
  // Zero reviewCount must never pass through — checkNoZeroRatings would reject it anyway,
  // but the generator itself must not emit it in the first place.
  const node = buildAggregateRating([{ platform: "Google Maps", rating: 4.9, reviewCount: 0 }]);
  assert.equal(node, null);
}

{
  // Zero/negative ratingValue must never pass through either.
  const node = buildAggregateRating([{ platform: "Google Maps", rating: 0, reviewCount: 152 }]);
  assert.equal(node, null);
}

{
  // Malformed input (not an array at all) must degrade gracefully, not throw.
  assert.doesNotThrow(() => buildAggregateRating(undefined));
  assert.equal(buildAggregateRating(undefined), null);
  assert.equal(buildAggregateRating(null), null);
}

// ── buildOrganizationNode() — end-to-end, real fs ───────────────────────────

await withTempRoot(async (root) => {
  await writeFixtures(root, {
    reviewPlatforms: {
      profiles: [
        { platform: "Trustpilot", rating: 4.8, reviewCount: 51 },
        { platform: "Google Maps", rating: 4.9, reviewCount: 152 },
      ],
    },
  });
  const node = await buildOrganizationNode(root, "/");
  assert.deepEqual(node.aggregateRating, {
    "@type": "AggregateRating",
    ratingValue: 4.9,
    reviewCount: 152,
    bestRating: 5,
  });
  assert.equal(node["@id"], "https://javavolcano-touroperator.com/#organization");
  assert.equal(node.name, "Java Volcano Tour Operator");
});

await withTempRoot(async (root) => {
  // review-platforms.json never written — simulates it being absent/unreachable.
  await writeFixtures(root);
  const node = await buildOrganizationNode(root, "/");
  assert.equal("aggregateRating" in node, false, "no rating source => no aggregateRating key at all");
  assert.equal(node.name, "Java Volcano Tour Operator", "every other field still builds normally");
});

await withTempRoot(async (root) => {
  // File present, but the Google Maps entry itself is unverified (null rating/reviewCount)
  // — real review-platforms.json currently has exactly this shape for GetYourGuide.
  await writeFixtures(root, {
    reviewPlatforms: { profiles: [{ platform: "Google Maps", rating: null, reviewCount: null }] },
  });
  const node = await buildOrganizationNode(root, "/");
  assert.equal("aggregateRating" in node, false);
});

console.log("build-organization.test.mjs: all assertions passed");
