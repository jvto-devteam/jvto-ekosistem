import assert from "node:assert/strict";
import { generateCustomerPortalBookingDetails } from "../../../lib/booking-sync/generators/customer-portal-booking-details.mjs";

const NOW = new Date("2026-08-19T00:00:00.000Z");

function detailBooking(overrides = {}) {
  return {
    id: 3453,
    booking_code: "JVR/027/08/26",
    booking_id: "JVTO-3453",
    url: "https://legacy.javavolcano-touroperator.com/bookings/details/abc123",
    status: "booked",
    customer_id: 991,
    customer_name: "Jane Doe",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland from Surabaya to Bali",
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
    tshirt_sizes: { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 },
    crews: { guides: [{ id: 4, name: "Taufik", role: "Escort Guide", photo: "https://example.test/t.jpg" }], drivers: [] },
    vehicle_specs: [{ name: "Hiace Commuter", capacity: "4 - 0 pax", banner: "https://example.test/h.png", interior: ["https://example.test/h1.png"] }],
    itineraries: [{ day: 1, title: "Day 1", itinerary: "Surabaya City - Bromo Area", activity: "Pick up  from  Surabaya" }],
    accommodations: [{ day: 1, name: "Joglo Kecombrang Bromo", rooms: "Double (3)", banner: "https://example.test/j.jpg" }],
    addons: [{ id: 734, name: "UBUD", qty: 1, price: 900000, subtotal: 900000 }],
    finance: {
      grand_total: 4590000,
      total_addons: 0,
      dp_amount: 4590000,
      balance: 18360000,
      paid_amount: 4590000,
      due_date: "2026-06-04 00:00:00",
      initial_payment_method: "cc",
      balance_payment_method: null,
      payment_link: "https://checkout.xendit.co/web/6a719f949a92762b801014e5",
      pending_upload_proof: false,
      uploaded_payment_proof: null,
      payment_history: [
        { id: 665, nominal: 4590000, description: "Down Payment", reference: "https://checkout.xendit.co/web/abc", method: "Debit/Credit Card", created_at: "2026-06-03 16:26:04" },
        { id: 666, nominal: 100000, description: "Manual Transfer", reference: null, method: "Bank Transfer", created_at: "2026-06-05 09:00:00" },
      ],
    },
    faq: { "Pre-Tour Information": { "Q?": "A." } },
    packing_recommendations: { "Travel Documents": ["Valid ID/Passport."] },
    essential_checklist: [{ item: "Valid passport with 6+ months validity", checked: false }],
    ...overrides,
  };
}

function contextOf(...bookings) {
  return { detailsBySlug: new Map(bookings.map((b, i) => [`slug-${i}`, b])) };
}

{
  const result = generateCustomerPortalBookingDetails(contextOf(detailBooking()), { now: NOW });

  assert.equal(result.schema_version, "jvto-booking/customer-portal-booking-details-v1");
  assert.equal(result.generated_at, "2026-08-19T00:00:00.000Z");
  assert.equal(
    result.privacy,
    "No customer names, contact details, portal slugs, payment links, media links, payment references, or uploaded proof URLs are stored.",
  );
  assert.equal(result.record_count, 1);
  assert.equal(result.records.length, 1);

  const r = result.records[0];
  assert.equal(r.booking_id, 3453, "booking_id comes from source .id (numeric)");
  assert.equal(r.booking_ref, "JVTO-3453", "booking_ref comes from source .booking_id (string ref)");
  assert.equal(r.booking_code, "JVR/027/08/26");
  assert.equal(r.channel, "JVTO");
  assert.equal(r.status, "booked");

  assert.deepEqual(r.product, {
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland from Surabaya to Bali",
    package_link: "https://javavolcano-touroperator.com/tours/from-surabaya/bromo-madakaripura-ijen-3d2n",
    duration: "3D 2N",
    travel_date_start: "2026-08-11",
    travel_date_end: "2026-08-13",
    total_pax: 9,
  });

  assert.deepEqual(r.tshirt_sizes, { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 });
  assert.deepEqual(r.addons, [{ id: 734, name: "UBUD", qty: 1, price: 900000, subtotal: 900000 }]);

  // grand_total is COMPUTED (dp_amount + balance), never copied from the unreliable source field
  assert.equal(r.finance.grand_total, 22950000);
  assert.notEqual(r.finance.grand_total, detailBooking().finance.grand_total);

  assert.equal(r.finance.total_addons, 0);
  assert.equal(r.finance.dp_amount, 4590000);
  assert.equal(r.finance.balance, 18360000);
  assert.equal(r.finance.paid_amount, 4590000);
  assert.equal(r.finance.due_date, "2026-06-04 00:00:00");
  assert.equal(r.finance.initial_payment_method, "cc");
  assert.equal(r.finance.balance_payment_method, null);
  assert.equal(r.finance.pending_upload_proof, false);

  assert.equal(r.finance.payment_link_present, true);
  assert.equal(r.finance.uploaded_payment_proof_present, false);
  assert.equal("payment_link" in r.finance, false, "raw payment link must never be stored");
  assert.equal("uploaded_payment_proof" in r.finance, false, "raw uploaded proof URL must never be stored");

  assert.deepEqual(r.finance.payment_history, [
    { id: 665, nominal: 4590000, description: "Down Payment", method: "Debit/Credit Card", created_at: "2026-06-03 16:26:04", reference_present: true },
    { id: 666, nominal: 100000, description: "Manual Transfer", method: "Bank Transfer", created_at: "2026-06-05 09:00:00", reference_present: false },
  ]);
  assert.equal("reference" in r.finance.payment_history[0], false, "raw payment reference must never be stored");

  for (const dropped of ["pickup", "special_requirements", "crews", "itineraries", "accommodations", "customer_name", "customer_id", "url", "media_link", "faq"]) {
    assert.equal(dropped in r, false, `raw-only field ${dropped} must not leak into the output record`);
  }
}

{
  // both _present booleans false when the source values are null
  const booking = detailBooking({
    finance: { ...detailBooking().finance, payment_link: null, uploaded_payment_proof: null },
  });
  const r = generateCustomerPortalBookingDetails(contextOf(booking), { now: NOW }).records[0];
  assert.equal(r.finance.payment_link_present, false);
  assert.equal(r.finance.uploaded_payment_proof_present, false);
}

{
  // both _present booleans true when the source values are non-null
  const booking = detailBooking({
    finance: { ...detailBooking().finance, payment_link: "https://checkout.test/x", uploaded_payment_proof: "https://example.test/proof.pdf" },
  });
  const r = generateCustomerPortalBookingDetails(contextOf(booking), { now: NOW }).records[0];
  assert.equal(r.finance.payment_link_present, true);
  assert.equal(r.finance.uploaded_payment_proof_present, true);
}

{
  // records are sorted by booking_id ascending regardless of Map insertion order
  const result = generateCustomerPortalBookingDetails(
    contextOf(detailBooking({ id: 3999 }), detailBooking({ id: 1566 }), detailBooking({ id: 2700 })),
    { now: NOW },
  );
  assert.deepEqual(result.records.map((r) => r.booking_id), [1566, 2700, 3999]);
  assert.equal(result.record_count, 3);
}

{
  // missing finance block must not throw
  const r = generateCustomerPortalBookingDetails(contextOf(detailBooking({ finance: undefined })), { now: NOW }).records[0];
  assert.equal(r.finance.grand_total, 0);
  assert.deepEqual(r.finance.payment_history, []);
}

console.log("customer-portal-booking-details.test.mjs: all assertions passed");
