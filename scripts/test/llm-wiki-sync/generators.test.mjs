import assert from "node:assert/strict";
import { generateTrustClaims } from "../../lib/llm-wiki-sync/generators/trust-claims.mjs";
import { generatePeople } from "../../lib/llm-wiki-sync/generators/people.mjs";
import { generatePolicies } from "../../lib/llm-wiki-sync/generators/policies.mjs";
import { generateDestinations } from "../../lib/llm-wiki-sync/generators/destinations.mjs";
import { generateProducts } from "../../lib/llm-wiki-sync/generators/products.mjs";
import { generateOperational } from "../../lib/llm-wiki-sync/generators/operational.mjs";
import { generateAeoSnippets } from "../../lib/llm-wiki-sync/generators/aeo-snippets.mjs";
import { generateFaq } from "../../lib/llm-wiki-sync/generators/faq.mjs";

// Test generators with null context (no snapshot)
const nullContext = {
  claims: null,
  people: null,
  policies: null,
  destinations: null,
  products: null,
  operational: null,
  aeoSnippets: null,
  faq: null,
};

const result1 = generateTrustClaims(nullContext);
assert.deepStrictEqual(result1.claims, []);
assert.strictEqual(result1.schemaVersion, "2024-08");

const result2 = generatePeople(nullContext);
assert.deepStrictEqual(result2.people, []);
assert.strictEqual(result2.schemaVersion, "2024-08");

const result3 = generatePolicies(nullContext);
assert.deepStrictEqual(result3.policies, []);
assert.strictEqual(result3.schemaVersion, "2024-08");

const result4 = generateDestinations(nullContext);
assert.deepStrictEqual(result4.destinations, []);
assert.strictEqual(result4.schemaVersion, "2024-08");

const result5 = generateProducts(nullContext);
assert.deepStrictEqual(result5.products, []);
assert.strictEqual(result5.schemaVersion, "2024-08");

const result6 = generateOperational(nullContext);
assert.deepStrictEqual(result6.operational, {});
assert.strictEqual(result6.schemaVersion, "2024-08");

const result7 = generateAeoSnippets(nullContext);
assert.deepStrictEqual(result7.snippets, []);
assert.strictEqual(result7.schemaVersion, "2024-08");

const result8 = generateFaq(nullContext);
assert.deepStrictEqual(result8.faqs, []);
assert.strictEqual(result8.schemaVersion, "2024-08");

// Test generators with data
const dataContext = {
  claims: [{ id: "C1", title: "Claim 1" }],
  people: [{ id: "P1", name: "Person 1" }],
  policies: [{ id: "POL1", name: "Policy 1" }],
  destinations: [{ id: "D1", name: "Destination 1" }],
  products: [{ id: "PR1", name: "Product 1" }],
  operational: { setting1: "value1" },
  aeoSnippets: [{ id: "AEO1", content: "Snippet 1" }],
  faq: [{ id: "F1", question: "Question 1" }],
};

const dataResult1 = generateTrustClaims(dataContext);
assert.strictEqual(dataResult1.claims[0].id, "C1");
assert.strictEqual(dataResult1.generatedFrom, "trust-bundle/v1.0");

const dataResult2 = generatePeople(dataContext);
assert.strictEqual(dataResult2.people[0].id, "P1");
assert.strictEqual(dataResult2.generatedFrom, "trust-bundle/v1.0");

console.log("generators.test.mjs: all assertions passed");
