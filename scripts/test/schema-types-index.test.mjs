import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

const index = await readJson("5-experience-engine/json-ld/schema-types-index.json");
const home = await readJson("5-experience-engine/json-ld/pages/home.schema-output.json");
const reviews = await readJson("5-experience-engine/json-ld/pages/why-jvto__reviews.schema-output.json");

const organization = home.json_ld["@graph"].find((node) =>
  Array.isArray(node["@type"])
    ? node["@type"].includes("Organization")
    : node["@type"] === "Organization",
);
assert.equal(organization.aggregateRating?.["@type"], "AggregateRating");
assert.ok(organization.aggregateRating.ratingValue > 0);
assert.ok(organization.aggregateRating.reviewCount >= 1);

assert.ok(
  reviews.json_ld["@graph"].some((node) => node["@type"] === "Review"),
  "the review hub graph must contain Review nodes",
);

assert.match(index.knownOmissions.AggregateRating, /emitted/i);
assert.match(index.knownOmissions.AggregateRating, /Google Maps only/i);
assert.match(index.knownOmissions.Review, /emitted/i);
assert.doesNotMatch(index.knownOmissions.AggregateRating, /intentionally absent from every schema-output\.json/i);
assert.doesNotMatch(index.knownOmissions.Review, /intentionally absent from every schema-output\.json/i);

console.log("schema-types-index.test.mjs: all assertions passed");
