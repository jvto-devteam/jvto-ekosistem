import { ORG_ID } from "../build-organization.mjs";

export const BASE_URL = "https://javavolcano-touroperator.com";
export const HUB_ROUTE = "/why-jvto/reviews";

const ALLOWED_PLATFORMS = new Set(["Trustpilot", "TripAdvisor", "Google"]);

function isHubEligible(review) {
  return (
    typeof review.star === "number" &&
    review.star >= 1 &&
    ALLOWED_PLATFORMS.has(review.platform) &&
    typeof review.review === "string" &&
    review.review !== ""
  );
}

function platformSlug(platform) {
  return String(platform).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * One nested Organization-class node per Review, scoped to the hub page's own URL
 * (`#platform-<slug>`) rather than resolved through the external-entities registry
 * (1-knowledge-and-evidence-core/organization-identity/external-entities.json) —
 * that registry is for third-party organisations with owner-verified `sameAs` URLs
 * ("Never add a sameAs URL without verifying it"), and Google/Trustpilot/TripAdvisor
 * as review PLATFORMS are out of this task's scope. A full inline node (not a bare
 * {"@id"} reference) is required either way: checkDanglingReferences in
 * scripts/validate-schema.mjs only exempts bare references that resolve to a
 * top-level node in the same file OR the external-entities registry, and
 * checkOrganizationIdentity requires every Organization-class node to carry an @id.
 * Duplicated per review on purpose — cheap, always self-consistent, no cross-review
 * dedup bookkeeping needed.
 */
function platformPublisherNode(platform, pageUrl) {
  return {
    "@id": `${pageUrl}#platform-${platformSlug(platform)}`,
    "@type": "Organization",
    name: platform,
  };
}

/**
 * Flat top-level `Review` nodes for the hub page
 * (why-jvto__reviews.schema-output.json), one per eligible review record — mirrors
 * jvto-web's now-removed buildIndividualReviewSchemas()
 * (src/lib/schemas/buildWhyJvtoSchemas.ts) in shape, including the same eligibility
 * filter jvto-web's getReviewsForSchema() used to apply upstream (star is a number
 * >= 1, platform is one of the three tracked platforms, review text is non-empty).
 */
export function buildHubReviewNodes(reviews, { baseUrl = BASE_URL } = {}) {
  const pageUrl = `${baseUrl}${HUB_ROUTE}`;
  return reviews.filter(isHubEligible).map((review) => ({
    "@id": `${baseUrl}/#review-${review.id}`,
    "@type": "Review",
    author: { "@type": "Person", name: review.customerName },
    reviewRating: {
      "@type": "Rating",
      ratingValue: String(review.star),
      bestRating: "5",
      worstRating: "1",
    },
    reviewBody: review.review,
    datePublished: review.date,
    ...(review.url || review.urlReference ? { url: review.url || review.urlReference } : {}),
    itemReviewed: { "@id": ORG_ID },
    publisher: platformPublisherNode(review.platform, pageUrl),
  }));
}

function packageUrlFor(slug, { baseUrl = BASE_URL } = {}) {
  if (!slug) return `${baseUrl}/tours`;
  return slug.startsWith("tours/") ? `${baseUrl}/${slug}` : `${baseUrl}/tours/${slug}`;
}

/**
 * `Product` node with a nested `Review` for one individual review detail page
 * (why-jvto__reviews__<id>.schema-output.json, route /why-jvto/reviews/<id>) —
 * mirrors the shape jvto-web's why-jvto/reviews/[id]/page.tsx built inline before
 * this migration, plus two additions the design spec calls for explicitly: an @id
 * on the nested Review (`#review-<id>`) and an itemReviewed pointing at ORG_ID
 * (safe here because the caller always puts the full Organization node in the same
 * file's @graph — see generate-review-schema.mjs).
 *
 * `review.id` is preserved verbatim from reviews.json (see that file's `_comment`)
 * — never renumber it, it is baked into the live #review-{id} @id and the
 * /why-jvto/reviews/{id} URL already. Called unconditionally for every record in
 * reviews.json — unlike the hub, this is not filtered by platform/star/review-text
 * eligibility, because the [id] page looks reviews up by id directly.
 */
export function buildReviewDetailProductNode(review, { baseUrl = BASE_URL } = {}) {
  const packageName = review.packageName ?? "Java Volcano Tour Package";
  return {
    "@id": `${baseUrl}${HUB_ROUTE}/${review.id}#product`,
    "@type": "Product",
    name: packageName,
    brand: { "@id": ORG_ID },
    url: packageUrlFor(review.packageSlug, { baseUrl }),
    review: {
      "@type": "Review",
      "@id": `${baseUrl}/#review-${review.id}`,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.star ?? 5,
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: review.customerName },
      reviewBody: review.review,
      datePublished: new Date(review.date).toISOString(),
      itemReviewed: { "@id": ORG_ID },
      publisher: { "@id": ORG_ID },
    },
  };
}
