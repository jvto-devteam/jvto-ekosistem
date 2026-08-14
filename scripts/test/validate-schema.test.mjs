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
