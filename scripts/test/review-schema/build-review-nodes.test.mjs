import assert from "node:assert/strict";
import {
  buildHubReviewNodes,
  buildReviewDetailProductNode,
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
  assert.equal(google.url, googleReview.url, "url must win over urlReference when both are present");
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
  assert.equal(review.datePublished, new Date(googleReview.date).toISOString());
  assert.deepEqual(review.itemReviewed, { "@id": ORG_ID });
  assert.deepEqual(review.publisher, { "@id": ORG_ID });
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

console.log("build-review-nodes.test.mjs: all assertions passed");
