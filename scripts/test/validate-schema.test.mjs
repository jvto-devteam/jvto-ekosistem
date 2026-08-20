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

{
  // PDP routes' own #webpage self-reference (from TouristTrip.mainEntityOfPage)
  // is exempt — WebPage is deliberately built locally by jvto-web for these
  // routes, not emitted by ekosistem, so it never appears in this file's own
  // @graph. See build-tourist-trip.mjs's scope-boundary doc.
  const route = "/tours/from-bali/bromo-ijen-3d2n";
  const graph = {
    "@graph": [
      {
        "@id": `https://javavolcano-touroperator.com${route}#tour`,
        "@type": "TouristTrip",
        mainEntityOfPage: { "@id": `https://javavolcano-touroperator.com${route}#webpage` },
      },
    ],
  };
  const violations = checkDanglingReferences(graph, route);
  assert.equal(violations.length, 0, "PDP route's own #webpage reference must not be flagged as dangling");
}

{
  // The PDP #webpage exemption must not swallow a genuinely different/mistyped
  // #webpage-shaped reference on a PDP route (e.g. pointing at another route
  // entirely) — only this route's OWN #webpage id is exempt.
  const route = "/tours/from-bali/bromo-ijen-3d2n";
  const graph = {
    "@graph": [
      {
        "@id": `https://javavolcano-touroperator.com${route}#tour`,
        "@type": "TouristTrip",
        mainEntityOfPage: { "@id": "https://javavolcano-touroperator.com/tours/from-bali/some-other-route#webpage" },
      },
    ],
  };
  const violations = checkDanglingReferences(graph, route);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /some-other-route#webpage/);
}

{
  // Non-PDP routes get no #webpage exemption at all — a dangling #webpage
  // reference on a CMS-content route (which IS expected to define its own
  // WebPage node in-file, per render-web-content-sources.mjs) must still fail.
  const graph = {
    "@graph": [
      {
        "@id": "https://javavolcano-touroperator.com/travel-guide#faq",
        "@type": "FAQPage",
        mainEntityOfPage: { "@id": "https://javavolcano-touroperator.com/travel-guide#webpage" },
      },
    ],
  };
  const violations = checkDanglingReferences(graph, "/travel-guide");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /#webpage/);
}

console.log("validate-schema.test.mjs: all assertions passed");
