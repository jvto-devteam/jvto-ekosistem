import assert from "node:assert/strict";
import { generateCustomerPortalAccommodationRecords } from "../../../lib/booking-sync/generators/customer-portal-accommodation-records.mjs";

const NOW = new Date("2026-08-19T00:00:00.000Z");

function detailBooking(overrides = {}) {
  return {
    id: 3453,
    booking_id: "JVTO-3453",
    customer_name: "Jane Doe",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    travel_date_start: "2026-08-11",
    travel_date_end: "2026-08-13",
    // deliberately NOT day-ascending: source order must be preserved verbatim
    accommodations: [
      { day: 2, name: "Riverside Homestay", banner: "https://example.test/r.jpg", rooms: "Deluxe Twin (3)" },
      { day: 1, name: "Joglo Kecombrang Bromo", banner: null, rooms: "" },
    ],
    ...overrides,
  };
}

function contextOf(...bookings) {
  return { detailsBySlug: new Map(bookings.map((b, i) => [`slug-${i}`, b])) };
}

{
  const result = generateCustomerPortalAccommodationRecords(contextOf(detailBooking()), { now: NOW });

  assert.equal(result.schema_version, "jvto-operations/customer-portal-accommodations-v1");
  assert.equal(result.generated_at, "2026-08-19T00:00:00.000Z");
  assert.equal(result.record_count, 1);
  assert.equal("privacy" in result, false, "this output deliberately carries no privacy key");

  const r = result.records[0];
  assert.deepEqual(r, {
    booking_id: 3453,
    booking_ref: "JVTO-3453",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    travel_date_start: "2026-08-11",
    accommodations: [
      { day: 2, name: "Riverside Homestay", rooms: "Deluxe Twin (3)", banner_present: true },
      { day: 1, name: "Joglo Kecombrang Bromo", rooms: "", banner_present: false },
    ],
  });

  // source array order preserved (NOT sorted by day)
  assert.deepEqual(r.accommodations.map((a) => a.day), [2, 1]);
  assert.equal("banner" in r.accommodations[0], false, "raw banner URL must never be stored");
  assert.equal("customer_name" in r, false);
  assert.equal("travel_date_end" in r, false);
}

{
  const r = generateCustomerPortalAccommodationRecords(contextOf(detailBooking({ accommodations: undefined })), { now: NOW }).records[0];
  assert.deepEqual(r.accommodations, []);
}

{
  const result = generateCustomerPortalAccommodationRecords(
    contextOf(detailBooking({ id: 3999 }), detailBooking({ id: 1566 }), detailBooking({ id: 2700 })),
    { now: NOW },
  );
  assert.deepEqual(result.records.map((r) => r.booking_id), [1566, 2700, 3999]);
  assert.equal(result.record_count, 3);
}

console.log("customer-portal-accommodation-records.test.mjs: all assertions passed");
