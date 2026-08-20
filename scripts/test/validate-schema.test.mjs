import assert from "node:assert/strict";
import { checkDanglingReferences, checkNoMissingIds, checkNoZeroRatings } from "../validate-schema.mjs";

{
  const graph = { "@graph": [{ "@type": "Organization" }] };
  const violations = checkNoMissingIds(graph, "route-a");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /route-a/);
}

{
  const graph = {
    "@graph": [{ "@id": "x", "@type": "Organization", aggregateRating: { reviewCount: 0, ratingValue: 0 } }],
  };
  const violations = checkNoZeroRatings(graph, "route-b");
  assert.equal(violations.length, 1);
}

{
  const graph = {
    "@graph": [{ "@id": "x", "@type": "Organization", aggregateRating: { reviewCount: 5, ratingValue: 4.5 } }],
  };
  const violations = checkNoZeroRatings(graph, "route-c");
  assert.equal(violations.length, 0);
}

{
  // Nested Review inside a Product (the review-detail page shape) with an invalid
  // ratingValue must now be caught too — this is the enforcement net a zero/malformed
  // star was previously sailing through undetected.
  const graph = {
    "@graph": [
      {
        "@id": "x",
        "@type": "Product",
        review: { "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: 0, bestRating: 5, worstRating: 1 } },
      },
    ],
  };
  const violations = checkNoZeroRatings(graph, "route-f");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /route-f/);
}

{
  // Non-numeric ratingValue (e.g. a string star that reached the graph) must also
  // be flagged, not silently pass because Number("abc") <= 0 is false.
  const graph = {
    "@graph": [
      {
        "@id": "x",
        "@type": "Product",
        review: { "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: "abc", bestRating: 5, worstRating: 1 } },
      },
    ],
  };
  const violations = checkNoZeroRatings(graph, "route-g");
  assert.equal(violations.length, 1);
}

{
  // A valid nested reviewRating must not be flagged.
  const graph = {
    "@graph": [
      {
        "@id": "x",
        "@type": "Product",
        review: { "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5, worstRating: 1 } },
      },
    ],
  };
  const violations = checkNoZeroRatings(graph, "route-h");
  assert.equal(violations.length, 0);
}

{
  const graph = {
    "@graph": [
      {
        "@id": "https://javavolcano-touroperator.com/travel-guide#webpage",
        "@type": "WebPage",
        isPartOf: { "@id": "https://javavolcano-touroperator.com/#missing" },
      },
    ],
  };
  const violations = checkDanglingReferences(graph, "route-d");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /#missing/);
}

{
  const graph = {
    "@graph": [
      {
        "@id": "https://javavolcano-touroperator.com/#organization",
        "@type": "Organization",
        sameAs: [{ "@id": "https://www.trustpilot.com/review/javavolcano-touroperator.com" }],
      },
    ],
  };
  const violations = checkDanglingReferences(graph, "route-external");
  assert.equal(violations.length, 0);
}

{
  const graph = {
    "@graph": [
      { "@id": "https://javavolcano-touroperator.com/#organization", "@type": "Organization" },
      {
        "@id": "https://javavolcano-touroperator.com/travel-guide#webpage",
        "@type": "WebPage",
        isPartOf: { "@id": "https://javavolcano-touroperator.com/#organization" },
      },
    ],
  };
  const violations = checkDanglingReferences(graph, "route-e");
  assert.equal(violations.length, 0);
}

console.log("validate-schema.test.mjs: all assertions passed");
