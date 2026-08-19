import assert from "node:assert/strict";
import { generateCustomerPortalFaqPackingFeed } from "../../../lib/booking-sync/generators/customer-portal-faq-packing-feed.mjs";

const NOW = new Date("2026-08-19T00:00:00.000Z");

function detailBooking(id, overrides = {}) {
  return {
    id,
    booking_id: `JVTO-${id}`,
    faq: {
      "Pre-Tour Information": { "What is included?": "Private AC transport." },
      "Activity-Based Information": { "Is the Ijen trek difficult?": "The trek is considered moderate." },
    },
    packing_recommendations: {
      "Travel Documents": ["Valid ID/Passport and travel insurance."],
      "Footwear Essentials": ["Sturdy hiking boots for treks."],
    },
    essential_checklist: [
      { item: "Valid passport with 6+ months validity", checked: false },
      { item: "Travel insurance purchased", checked: true },
    ],
    ...overrides,
  };
}

function contextOf(...bookings) {
  return { detailsBySlug: new Map(bookings.map((b) => [`slug-${b.id}`, b])) };
}

{
  // dedup across three identical-content bookings
  const result = generateCustomerPortalFaqPackingFeed(contextOf(detailBooking(1566), detailBooking(3999), detailBooking(2700)), { now: NOW });

  assert.equal(result.schema_version, "jvto-experience/portal-knowledge-feed-v1");
  assert.equal(result.generated_at, "2026-08-19T00:00:00.000Z");
  assert.equal(result.source, "compiled from customer portal detail payloads");
  assert.equal("privacy" in result, false, "this output deliberately carries no privacy key");
  assert.equal("records" in result, false, "this is a global feed, not a per-booking record list");

  assert.deepEqual(result.faqs, [
    { category: "Pre-Tour Information", question: "What is included?", answer: "Private AC transport." },
    { category: "Activity-Based Information", question: "Is the Ijen trek difficult?", answer: "The trek is considered moderate." },
  ]);
  assert.deepEqual(result.packing_recommendations, [
    { category: "Travel Documents", items: ["Valid ID/Passport and travel insurance."] },
    { category: "Footwear Essentials", items: ["Sturdy hiking boots for treks."] },
  ]);
  assert.deepEqual(result.essential_checklist, [
    { item: "Valid passport with 6+ months validity" },
    { item: "Travel insurance purchased" },
  ]);
  assert.equal("checked" in result.essential_checklist[0], false, "the source `checked` key is dropped entirely, not set to false");

  assert.equal(result.faq_count, 2);
  assert.equal(result.packing_category_count, 2);
  assert.equal(result.checklist_item_count, 2);
}

{
  // CONFLICT: same (category, question), different answers -> majority vote wins,
  // even though the minority answer belongs to the LOWEST booking_id
  const minority = detailBooking(1566, { faq: { "Pre-Tour Information": { "What is included?": "MINORITY ANSWER" } } });
  const majorityA = detailBooking(3999, { faq: { "Pre-Tour Information": { "What is included?": "MAJORITY ANSWER" } } });
  const majorityB = detailBooking(2700, { faq: { "Pre-Tour Information": { "What is included?": "MAJORITY ANSWER" } } });

  for (const ordering of [[minority, majorityA, majorityB], [majorityB, minority, majorityA], [majorityA, majorityB, minority]]) {
    const result = generateCustomerPortalFaqPackingFeed(contextOf(...ordering), { now: NOW });
    assert.equal(result.faq_count, 1);
    assert.deepEqual(result.faqs, [
      { category: "Pre-Tour Information", question: "What is included?", answer: "MAJORITY ANSWER" },
    ]);
  }
}

{
  // TIE: two answers, one booking each -> the answer from the LOWEST booking_id wins,
  // independent of Map insertion order
  const low = detailBooking(1566, { faq: { "Pre-Tour Information": { "What is included?": "ANSWER FROM LOW ID" } } });
  const high = detailBooking(3999, { faq: { "Pre-Tour Information": { "What is included?": "ANSWER FROM HIGH ID" } } });

  for (const ordering of [[low, high], [high, low]]) {
    const result = generateCustomerPortalFaqPackingFeed(contextOf(...ordering), { now: NOW });
    assert.deepEqual(result.faqs, [
      { category: "Pre-Tour Information", question: "What is included?", answer: "ANSWER FROM LOW ID" },
    ]);
  }
}

{
  // packing/checklist dedup is order-independent: same category from a different booking keeps one entry,
  // and the emitted order follows booking_id-ascending traversal
  const a = detailBooking(3999, {
    packing_recommendations: { "Must-Have Gear": ["Headlamp"] },
    essential_checklist: [{ item: "Headlamp packed", checked: true }],
  });
  const b = detailBooking(1566, {
    packing_recommendations: { "Travel Documents": ["Valid ID/Passport."], "Must-Have Gear": ["Headlamp"] },
    essential_checklist: [{ item: "Travel insurance purchased", checked: false }, { item: "Headlamp packed", checked: false }],
  });

  for (const ordering of [[a, b], [b, a]]) {
    const result = generateCustomerPortalFaqPackingFeed(contextOf(...ordering), { now: NOW });
    assert.deepEqual(result.packing_recommendations, [
      { category: "Travel Documents", items: ["Valid ID/Passport."] },
      { category: "Must-Have Gear", items: ["Headlamp"] },
    ]);
    assert.equal(result.packing_category_count, 2);
    assert.deepEqual(result.essential_checklist, [{ item: "Travel insurance purchased" }, { item: "Headlamp packed" }]);
    assert.equal(result.checklist_item_count, 2);
  }
}

{
  // packing_recommendations expressed as an array of {category, items} is handled too
  const result = generateCustomerPortalFaqPackingFeed(
    contextOf(detailBooking(1566, { packing_recommendations: [{ category: "Must-Have Gear", items: ["Headlamp"] }] })),
    { now: NOW },
  );
  assert.deepEqual(result.packing_recommendations, [{ category: "Must-Have Gear", items: ["Headlamp"] }]);
}

{
  // empty context and missing blocks must not throw
  const empty = generateCustomerPortalFaqPackingFeed({ detailsBySlug: new Map() }, { now: NOW });
  assert.deepEqual(empty.faqs, []);
  assert.deepEqual(empty.packing_recommendations, []);
  assert.deepEqual(empty.essential_checklist, []);
  assert.equal(empty.faq_count, 0);
  assert.equal(empty.packing_category_count, 0);
  assert.equal(empty.checklist_item_count, 0);

  const sparse = generateCustomerPortalFaqPackingFeed(
    contextOf(detailBooking(1566, { faq: undefined, packing_recommendations: undefined, essential_checklist: undefined })),
    { now: NOW },
  );
  assert.equal(sparse.faq_count, 0);
}

console.log("customer-portal-faq-packing-feed.test.mjs: all assertions passed");
