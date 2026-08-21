import { ORG_ID } from "../build-organization.mjs";

export const BASE_URL = "https://javavolcano-touroperator.com";
export const HUB_ROUTE = "/why-jvto/reviews";

const ALLOWED_PLATFORMS = new Set(["Trustpilot", "TripAdvisor", "Google"]);

/**
 * Same validity rule the hub's eligibility filter has always applied to `star`:
 * a real number in [1, 5]. Exported so the generator can reuse it to decide
 * whether a present-but-invalid star (0, 6, a string — anything that isn't
 * nullish but still fails this check) deserves a console.warn before falling
 * back to a safe default; that fallback happens in `sanitizeStar` below.
 */
export function isValidStar(star) {
  return typeof star === "number" && star >= 1 && star <= 5;
}

/**
 * `??` only catches null/undefined — a `star: 0` (falsy but not nullish) or a
 * string star would sail through a `review.star ?? 5` fallback unchanged and
 * reach the output graph as an invalid ratingValue. This treats "present but
 * invalid" the same as "absent": both fall back to 5. Pure — no I/O, no
 * console output; the generator is responsible for warning when the value was
 * present-but-invalid (see isValidStar above).
 */
function sanitizeStar(star) {
  return isValidStar(star) ? star : 5;
}

function isHubEligible(review) {
  return (
    isValidStar(review.star) &&
    ALLOWED_PLATFORMS.has(review.platform) &&
    typeof review.review === "string" &&
    review.review !== ""
  );
}

function platformSlug(platform) {
  return String(platform).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * One nested Organization-class node per Review, scoped to the CALLER's own page URL
 * (`#platform-<slug>`) — the hub passes its own hub URL, the detail builder below
 * passes that review's own detail-page URL, so the two representations of the same
 * review never collide on the same `#platform-google` @id — rather than resolved
 * through the external-entities registry
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
    ...(publicReviewUrl(review) ? { url: publicReviewUrl(review) } : {}),
    itemReviewed: { "@id": ORG_ID },
    publisher: platformPublisherNode(review.platform, pageUrl),
  }));
}

/**
 * The review's URL, but only when a stranger can actually open it.
 *
 * 152 of the 217 records carry a business.google.com/n/<account>/reviews/<id>
 * link. That is the merchant console: it 302s to a Google Business support
 * article for anyone who is not signed in as the account owner. Publishing it
 * as a Review node's `url` claims "here is the source, go check" while handing
 * the reader a door they cannot open — worse for trust than publishing no link
 * at all, because it looks like verifiability until you click.
 *
 * So merchant-console links are dropped from the emitted schema. The record
 * keeps them (they identify the review inside the owner's console, and the
 * daily sync dedupes on urlReference), and `publisher` still attributes the
 * platform. Restore the field the moment a public permalink exists.
 */
function publicReviewUrl(review) {
  const candidate = review.url || review.urlReference || "";
  if (!/^https?:\/\//i.test(candidate)) return null;
  if (candidate.includes("business.google.com")) return null;
  return candidate;
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
 *
 * The nested Review here shares its `@id` (`#review-{id}`) with the hub's flat
 * Review node for the same record, so the two representations are reconciled to
 * agree on every field: `datePublished` uses the same raw `review.date` string
 * (not re-derived through `Date#toISOString`), and `publisher` points at the
 * actual review platform via `platformPublisherNode` (not at ORG_ID — JVTO is
 * never the publisher of a review of itself). `reviewBody` is omitted entirely
 * (not emitted as `""`) when the record has no review text, so an empty record
 * doesn't get asserted as reviewed content.
 */
export function buildReviewDetailProductNode(review, { baseUrl = BASE_URL } = {}) {
  const packageName = review.packageName ?? "Java Volcano Tour Package";
  const detailUrl = `${baseUrl}${HUB_ROUTE}/${review.id}`;
  return {
    "@id": `${detailUrl}#product`,
    "@type": "Product",
    name: packageName,
    brand: { "@id": ORG_ID },
    url: packageUrlFor(review.packageSlug, { baseUrl }),
    review: {
      "@type": "Review",
      "@id": `${baseUrl}/#review-${review.id}`,
      reviewRating: {
        "@type": "Rating",
        ratingValue: sanitizeStar(review.star),
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: review.customerName },
      ...(review.review ? { reviewBody: review.review } : {}),
      datePublished: review.date,
      itemReviewed: { "@id": ORG_ID },
      publisher: platformPublisherNode(review.platform, detailUrl),
    },
  };
}
