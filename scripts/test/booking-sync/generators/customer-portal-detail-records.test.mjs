import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { generateCustomerPortalDetailRecords } from "../../../lib/booking-sync/generators/customer-portal-detail-records.mjs";

const NOW = new Date("2026-08-19T00:00:00.000Z");
const SLUG = "be56b879596b2ad4be56b879596b2ad4";

function detailBooking(overrides = {}) {
  return {
    id: 3453,
    booking_code: "JVR/027/08/26",
    booking_id: "JVTO-3453",
    url: "https://legacy.javavolcano-touroperator.com/bookings/details/" + SLUG,
    status: "booked",
    customer_id: 991,
    customer_name: "Jane Doe",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    channel: "JVTO",
    package_link: "https://javavolcano-touroperator.com/tours/from-surabaya/bromo-madakaripura-ijen-3d2n",
    duration: "3D 2N",
    travel_date_start: "2026-08-11",
    travel_date_end: "2026-08-13",
    total_pax: 9,
    pickup: "Surabaya Airport",
    pickup_time: "10:47:00",
    drop: "Gilimanuk Harbour",
    drop_time: null,
    special_requirements: "Vegetarian meals",
    media_link: "https://drive.google.com/drive/folders/xyz",
    tshirt_sizes: { xs: 0, s: 0, m: 1, l: 0, xl: 0, xxl: 0 },
    crews: {
      guides: [{ id: 4, name: "Taufik", photo: "https://example.test/t.jpg", role: "Escort Guide" }],
      drivers: [{ id: 62, name: "Yusuf", photo: null, role: "Driver" }],
    },
    vehicle_specs: [{ name: "Hiace Commuter", capacity: "4 - 0 pax", banner: "https://example.test/h.png", interior: ["https://example.test/h1.png"] }],
    itineraries: [{ day: 1, title: "Day 1", itinerary: "Surabaya City - Bromo Area", activity: "Pick up  from   Surabaya" }],
    accommodations: [{ day: 1, name: "Joglo Kecombrang Bromo", banner: null, rooms: "Double (3)" }],
    addons: [{ id: 734, name: "UBUD", qty: 1, price: 900000, subtotal: 900000 }],
    finance: {
      grand_total: 4590000,
      total_addons: 900000,
      dp_amount: 4590000,
      balance: 18360000,
      paid_amount: 4590000,
      due_date: "2026-06-04 00:00:00",
      initial_payment_method: "cc",
      balance_payment_method: null,
      payment_link: "https://checkout.xendit.co/web/abc",
      pending_upload_proof: false,
      uploaded_payment_proof: null,
      payment_history: [
        { id: 665, nominal: 4590000, description: "Down Payment", reference: "https://checkout.xendit.co/web/abc", method: "Debit/Credit Card", created_at: "2026-06-03 16:26:04" },
        { id: 666, nominal: 100000, description: "Manual", reference: null, method: "Bank Transfer", created_at: "2026-06-05 09:00:00" },
      ],
    },
    faq: {
      "Pre-Tour Information": { "What is included?": "Private AC transport." },
      "During Tour Information": { "Is Wi-Fi available?": "Only at hotels." },
    },
    packing_recommendations: {
      "Travel Documents": ["Valid ID/Passport and travel insurance."],
      "Footwear Essentials": ["Sturdy hiking boots for treks."],
    },
    essential_checklist: [
      { item: "Valid passport with 6+ months validity", checked: true },
      { item: "Travel insurance purchased", checked: false },
    ],
    ...overrides,
  };
}

function contextOf(...entries) {
  return { detailsBySlug: new Map(entries) };
}

{
  const result = generateCustomerPortalDetailRecords(contextOf([SLUG, detailBooking()]), { now: NOW });

  assert.equal(result.schema_version, "jvto-experience-output/customer-portal-detail-records-v1");
  assert.equal(result.generated_at, "2026-08-19T00:00:00.000Z");
  assert.equal(result.source, "legacy customer portal details, sanitized from /bookings/details/{portal_slug}?json=true");
  assert.equal(result.record_count, 1);

  const r = result.records[0];
  // this file carries its privacy note per record (matching the original hand-written file), not on the wrapper
  assert.equal("privacy" in result, false);
  // the note must also disclose the free-text activity field as a non-guaranteed-PII-free exception
  assert.equal(
    r.privacy,
    "Customer name, customer id, portal slug, payment links, uploaded proofs, media URLs, and payment references are excluded from this active file. Exception: the free-text itinerary activity field (itinerary_days[].activity_text) is operational text entered by ops staff and may contain coordination details such as passenger names or flight numbers/times; unlike the structured fields, it is not guaranteed to be PII-free.",
  );
  assert.equal(r.booking_id, 3453, "booking_id comes from source .id");
  assert.equal(r.booking_ref, "JVTO-3453", "booking_ref comes from source .booking_id");
  assert.equal(r.booking_code, "JVR/027/08/26");
  assert.equal(r.channel, "JVTO");
  assert.equal(r.status, "booked");

  // portal_record_id is a one-way sha256 pseudonym of the slug; the raw slug never appears anywhere
  const expectedId = "portal_" + createHash("sha256").update(SLUG).digest("hex").slice(0, 16);
  assert.equal(r.portal_record_id, expectedId);
  assert.match(r.portal_record_id, /^portal_[0-9a-f]{16}$/);
  assert.equal(JSON.stringify(result).includes(SLUG), false, "the raw portal slug must never leak into the output");

  assert.deepEqual(r.product, {
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    package_link: "https://javavolcano-touroperator.com/tours/from-surabaya/bromo-madakaripura-ijen-3d2n",
    duration: "3D 2N",
    travel_date_start: "2026-08-11",
    travel_date_end: "2026-08-13",
    total_pax: 9,
  });

  assert.deepEqual(r.logistics, {
    pickup: "Surabaya Airport",
    pickup_time: "10:47:00",
    drop: "Gilimanuk Harbour",
    drop_time: null,
    special_requirements_present: true,
  });

  assert.deepEqual(r.tshirt_sizes, { xs: 0, s: 0, m: 1, l: 0, xl: 0, xxl: 0 });

  assert.deepEqual(r.itinerary_days, [
    { day: 1, title: "Day 1", itinerary: "Surabaya City - Bromo Area", activity_text: "Pick up from Surabaya" },
  ]);
  assert.equal("activity" in r.itinerary_days[0], false);

  assert.deepEqual(r.accommodations, [{ day: 1, name: "Joglo Kecombrang Bromo", rooms: "Double (3)", banner_present: false }]);
  assert.deepEqual(r.addons, [{ id: 734, name: "UBUD", qty: 1, price: 900000, subtotal: 900000 }]);

  assert.deepEqual(r.crews, {
    guides: [{ id: 4, name: "Taufik", role: "Escort Guide", photo_present: true }],
    drivers: [{ id: 62, name: "Yusuf", role: "Driver", photo_present: false }],
  });

  assert.deepEqual(r.vehicles, [{ name: "Hiace Commuter", capacity: "4 - 0 pax", banner_present: true, interior_image_count: 1 }]);

  assert.equal(r.finance.grand_total, 22950000, "grand_total is computed from paid_amount + balance");
  assert.equal(r.finance.total_addons, 900000);
  assert.equal(r.finance.payment_link_present, true);
  assert.equal(r.finance.uploaded_payment_proof_present, false);
  assert.equal("payment_link" in r.finance, false);
  assert.equal("uploaded_payment_proof" in r.finance, false);
  assert.deepEqual(r.finance.payment_history, [
    { id: 665, nominal: 4590000, description: "Down Payment", method: "Debit/Credit Card", created_at: "2026-06-03 16:26:04", reference_present: true },
    { id: 666, nominal: 100000, description: "Manual", method: "Bank Transfer", created_at: "2026-06-05 09:00:00", reference_present: false },
  ]);

  assert.deepEqual(r.portal_content, {
    faq_categories: ["Pre-Tour Information", "During Tour Information"],
    packing_categories: ["Travel Documents", "Footwear Essentials"],
    essential_checklist: [
      { item: "Valid passport with 6+ months validity", checked: false },
      { item: "Travel insurance purchased", checked: false },
    ],
    media_link_present: true,
  });
  // `checked` is always false, never copied from source (source item 1 had checked: true)
  assert.equal(r.portal_content.essential_checklist[0].checked, false);

  for (const dropped of ["customer_name", "customer_id", "url", "media_link", "faq", "packing_recommendations", "essential_checklist", "itineraries", "vehicle_specs", "special_requirements", "package_name"]) {
    assert.equal(dropped in r, false, `raw-only field ${dropped} must not leak into the output record`);
  }
}

{
  // SETTLED booking: grand_total must be the full invoice total, not the frozen deposit.
  // Mirrors real booking 1566: deposit 1,428,000 of a true 8,040,000 total.
  const settled = detailBooking({
    finance: {
      ...detailBooking().finance,
      grand_total: 8040000,
      dp_amount: 1428000,
      balance: 0,
      paid_amount: 8040000,
    },
  });
  const r = generateCustomerPortalDetailRecords(contextOf([SLUG, settled]), { now: NOW }).records[0];

  assert.equal(r.finance.grand_total, 8040000, "settled booking must report the full invoice total");
  assert.notEqual(r.finance.grand_total, 1428000, "grand_total must not collapse to the deposit once the balance is settled");
  assert.equal(r.finance.dp_amount, 1428000);
  assert.equal(r.finance.balance, 0);
}

{
  // media_link null => false
  const r = generateCustomerPortalDetailRecords(contextOf([SLUG, detailBooking({ media_link: null })]), { now: NOW }).records[0];
  assert.equal(r.portal_content.media_link_present, false);
}

{
  // packing_recommendations expressed as an array of {category, items} is handled too
  const r = generateCustomerPortalDetailRecords(
    contextOf([SLUG, detailBooking({ packing_recommendations: [{ category: "Must-Have Gear", items: ["Headlamp"] }] })]),
    { now: NOW },
  ).records[0];
  assert.deepEqual(r.portal_content.packing_categories, ["Must-Have Gear"]);
}

{
  // empty / missing portal content blocks must not throw
  const r = generateCustomerPortalDetailRecords(
    contextOf([SLUG, detailBooking({ faq: undefined, packing_recommendations: undefined, essential_checklist: undefined })]),
    { now: NOW },
  ).records[0];
  assert.deepEqual(r.portal_content.faq_categories, []);
  assert.deepEqual(r.portal_content.packing_categories, []);
  assert.deepEqual(r.portal_content.essential_checklist, []);
}

{
  const result = generateCustomerPortalDetailRecords(
    contextOf(["slug-a", detailBooking({ id: 3999 })], ["slug-b", detailBooking({ id: 1566 })], ["slug-c", detailBooking({ id: 2700 })]),
    { now: NOW },
  );
  assert.deepEqual(result.records.map((r) => r.booking_id), [1566, 2700, 3999]);
  assert.equal(result.record_count, 3);
  // distinct slugs produce distinct pseudonyms
  assert.equal(new Set(result.records.map((r) => r.portal_record_id)).size, 3);
}

console.log("customer-portal-detail-records.test.mjs: all assertions passed");
