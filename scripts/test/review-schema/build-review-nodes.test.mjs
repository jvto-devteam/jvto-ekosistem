import assert from "node:assert/strict";
import {
  buildAggregateRating,
  buildHubReviewNodes,
  buildReviewDetailProductNode,
  isValidStar,
  BASE_URL,
  HUB_ROUTE,
} from "../../lib/review-schema/build-review-nodes.mjs";
import { ORG_ID } from "../../lib/build-organization.mjs";

const googleReview = {
  id: 78,
  platform: "Google",
  customerName: "HuiYuan Yeoh",
  date: "2026-07-12",
  star: 5,
  review: "Booked the 4d3n tour to Tumpak Sewu, Mt Bromo and Kawah Ijen from the JVTO website.",
  photos: { source: "Google Business Profile reviewMediaItems", count: 7, items: [] },
  url: "https://business.google.com/n/11306571900359184784/reviews/Ci9DQUlR",
  urlReference: "accounts/113259255222289357013/locations/11306571900359184784/reviews/AbFvOqn",
  packageSlug: null,
  packageName: null,
  crewCodes: ["taufik", "fauzi"],
};

const trustpilotReview = {
  id: 65,
  platform: "Trustpilot",
  customerName: "Patarachai Sereerat",
  date: "2026-01-18",
  star: 5,
  review: "Amazing trip! Had an amazing trip visiting Bromo, Ijen Crater, and Tumpak Sewu Waterfall!",
  photos: null,
  url: "https://www.trustpilot.com/reviews/696ccc50a8dcb95a58473ac5",
  urlReference: "https://www.trustpilot.com/reviews/696ccc50a8dcb95a58473ac5",
  packageSlug: "tours/from-surabaya/ijen-papuma-tumpak-sewu-bromo-4d3n",
  packageName: "4 Day Ijen, Papuma Beach, Tumpak Sewu & Bromo Journey from Surabaya",
  crewCodes: ["yandi", "boy"],
};

const facebookReview = { ...trustpilotReview, id: 999, platform: "Facebook" };
const emptyTextReview = { ...trustpilotReview, id: 998, review: "" };
const noStarReview = { ...trustpilotReview, id: 997, star: null };

// --- buildHubReviewNodes: eligibility filter (mirrors jvto-web's now-removed
// getReviewsForSchema() + buildIndividualReviewSchemas() combined filter: star is a
// number >= 1, platform is one of the three tracked platforms, review text non-empty) ---
{
  const nodes = buildHubReviewNodes([
    googleReview,
    trustpilotReview,
    facebookReview,
    emptyTextReview,
    noStarReview,
  ]);
  assert.equal(nodes.length, 2, "only the Google and Trustpilot reviews are eligible for the hub array");

  const google = nodes.find((n) => n["@id"] === `${BASE_URL}/#review-78`);
  assert.ok(google, "Google review node must be present with the exact #review-{id} @id");
  assert.equal(google["@type"], "Review");
  assert.deepEqual(google.author, { "@type": "Person", name: "HuiYuan Yeoh" });
  assert.deepEqual(google.reviewRating, {
    "@type": "Rating",
    ratingValue: "5",
    bestRating: "5",
    worstRating: "1",
  });
  assert.equal(google.reviewBody, googleReview.review);
  assert.equal(google.datePublished, "2026-07-12");
  // A merchant-console link must never be emitted as the review's source: it
  // 302s to a Google support article for anyone who is not the account owner,
  // so publishing it claims verifiability the reader cannot exercise. The
  // record keeps the link; the schema does not carry it.
  assert.equal(
    "url" in google,
    false,
    "business.google.com console links must be omitted from the emitted node",
  );
  assert.deepEqual(google.itemReviewed, { "@id": ORG_ID });
  assert.equal(google.publisher["@type"], "Organization");
  assert.equal(google.publisher.name, "Google");
  assert.equal(
    google.publisher["@id"],
    `${BASE_URL}${HUB_ROUTE}#platform-google`,
    "publisher must carry its own @id — an anonymous Organization node fails checkOrganizationIdentity",
  );

  const trustpilot = nodes.find((n) => n["@id"] === `${BASE_URL}/#review-65`);
  assert.ok(trustpilot);
  assert.equal(trustpilot.publisher["@id"], `${BASE_URL}${HUB_ROUTE}#platform-trustpilot`);
}

{
  // url falls back to urlReference when the primary url is absent.
  const noUrlReview = { ...trustpilotReview, id: 996, url: null };
  const nodes = buildHubReviewNodes([noUrlReview]);
  assert.equal(nodes[0].url, trustpilotReview.urlReference);
}

{
  // neither url nor urlReference present — the url key must be omitted, not null.
  const noUrlAtAll = { ...trustpilotReview, id: 995, url: null, urlReference: null };
  const nodes = buildHubReviewNodes([noUrlAtAll]);
  assert.equal("url" in nodes[0], false);
}

{
  // empty input must not throw — "data kosong" graceful case.
  assert.deepEqual(buildHubReviewNodes([]), []);
}

// --- buildReviewDetailProductNode: one node per record, unconditional (every id in
// reviews.json must get a detail file, regardless of the hub's stricter eligibility
// filter — the [id] page reads by id directly, not through the hub's filtered list) ---
{
  const product = buildReviewDetailProductNode(googleReview);
  assert.equal(product["@id"], `${BASE_URL}${HUB_ROUTE}/78#product`);
  assert.equal(product["@type"], "Product");
  assert.equal(product.name, "Java Volcano Tour Package", "packageName null must fall back to the generic name");
  assert.deepEqual(product.brand, { "@id": ORG_ID });
  assert.equal(product.url, `${BASE_URL}/tours`, "packageSlug null must fall back to the tours hub URL");

  const review = product.review;
  assert.equal(review["@type"], "Review");
  assert.equal(review["@id"], `${BASE_URL}/#review-78`);
  assert.deepEqual(review.reviewRating, { "@type": "Rating", ratingValue: 5, bestRating: 5, worstRating: 1 });
  assert.deepEqual(review.author, { "@type": "Person", name: "HuiYuan Yeoh" });
  assert.equal(review.reviewBody, googleReview.review);
  assert.equal(
    review.datePublished,
    googleReview.date,
    "datePublished must match the hub's raw review.date, not a re-derived ISO string — the hub and detail Review nodes share the same @id and must agree on every field",
  );
  assert.deepEqual(review.itemReviewed, { "@id": ORG_ID });
  assert.equal(
    review.publisher["@type"],
    "Organization",
    "publisher must be the actual review platform, not JVTO itself reviewing its own review",
  );
  assert.equal(review.publisher.name, "Google");
  assert.equal(
    review.publisher["@id"],
    `${BASE_URL}${HUB_ROUTE}/78#platform-google`,
    "detail page's platform publisher @id must be scoped to its own route, not collide with the hub's #platform-google",
  );
}

{
  // Empty review text (the 14 records that fail the hub's eligibility filter on
  // review text) must omit reviewBody entirely, not assert an empty string as
  // review content.
  const product = buildReviewDetailProductNode(emptyTextReview);
  assert.equal(
    "reviewBody" in product.review,
    false,
    "empty review.review must omit reviewBody entirely, not emit reviewBody: ''",
  );
}

{
  // star: 0 is invalid (not nullish, so `??` would let it through) — must still
  // fall back to 5, matching the hub's own >= 1 eligibility rule.
  const product = buildReviewDetailProductNode({ ...trustpilotReview, star: 0 });
  assert.equal(product.review.reviewRating.ratingValue, 5);
}

{
  // A non-number star (e.g. a string) must also fall back to 5, not pass through
  // type-inconsistent with the numeric bestRating/worstRating.
  const product = buildReviewDetailProductNode({ ...trustpilotReview, star: "5" });
  assert.equal(product.review.reviewRating.ratingValue, 5);
}

{
  // star: 6 is out of range — also invalid, also falls back to 5.
  const product = buildReviewDetailProductNode({ ...trustpilotReview, star: 6 });
  assert.equal(product.review.reviewRating.ratingValue, 5);
}

{
  const product = buildReviewDetailProductNode(trustpilotReview);
  assert.equal(product.name, trustpilotReview.packageName);
  assert.equal(
    product.url,
    `${BASE_URL}/${trustpilotReview.packageSlug}`,
    "a packageSlug already prefixed with tours/ must not be double-prefixed",
  );
}

{
  // star missing/null must not crash and must fall back to 5, matching the previous
  // inline builder's `review.star ?? 5`.
  const product = buildReviewDetailProductNode({ ...trustpilotReview, star: null });
  assert.equal(product.review.reviewRating.ratingValue, 5);
}

// --- isValidStar: exported so the generator can decide when a present-but-invalid
// star deserves a console.warn before the builder's pure fallback to 5 ---
{
  assert.equal(isValidStar(5), true);
  assert.equal(isValidStar(1), true);
  assert.equal(isValidStar(0), false, "0 is falsy but not nullish — must be treated as invalid, not silently passed through by ??");
  assert.equal(isValidStar(6), false, "out of range");
  assert.equal(isValidStar("5"), false, "non-number must be invalid even if numeric-looking");
  assert.equal(isValidStar(null), false);
  assert.equal(isValidStar(undefined), false);
}

// --- buildAggregateRating: derived from the nodes the page publishes, so a reader
// can reproduce the average from the quotations in front of them ---
{
  const rated = (star) => ({ reviewRating: { "@type": "Rating", ratingValue: String(star) } });

  const mixed = buildAggregateRating([rated(5), rated(5), rated(4)]);
  assert.equal(mixed.ratingValue, "4.7", "mean of 5,5,4 rounds to one decimal");
  assert.equal(mixed.reviewCount, 3);
  assert.equal(mixed.bestRating, "5");
  assert.equal(mixed.worstRating, "1");
  assert.equal(mixed["@type"], "AggregateRating");

  assert.equal(
    buildAggregateRating([rated(5), rated(5)]).ratingValue,
    "5",
    "a clean 5 must not publish as '5.0' — the individual ratingValues are written '5'",
  );

  assert.equal(
    buildAggregateRating([]),
    null,
    "no reviews means no rating; ratingValue 0 would claim guests rated the tour zero",
  );
  assert.equal(buildAggregateRating(undefined), null);
  assert.equal(
    buildAggregateRating([{ reviewRating: { ratingValue: "not a number" } }]),
    null,
    "a set with no parseable star yields no aggregate rather than NaN",
  );

  // The generator passes every node for the route, not the capped slice, so
  // reviewCount states how many reviews the average actually covers.
  const many = buildAggregateRating(Array.from({ length: 89 }, () => rated(5)));
  assert.equal(many.reviewCount, 89, "count is over the whole attributed set, not PDP_REVIEW_CAP");
}

console.log("build-review-nodes.test.mjs: all assertions passed");
