import assert from "node:assert/strict";
import { generateCustomerPortalLogistics } from "../../../lib/booking-sync/generators/customer-portal-logistics.mjs";

const NOW = new Date("2026-08-19T00:00:00.000Z");

function detailBooking(overrides = {}) {
  return {
    id: 3453,
    booking_id: "JVTO-3453",
    booking_code: "JVR/027/08/26",
    status: "booked",
    customer_name: "Jane Doe",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    travel_date_start: "2026-08-11",
    travel_date_end: "2026-08-13",
    total_pax: 9,
    pickup: "Surabaya Airport Terminal 2",
    pickup_time: "10:47:00",
    drop: "Gilimanuk Harbour",
    drop_time: "07:05:00",
    special_requirements: "Vegetarian meals",
    ...overrides,
  };
}

function contextOf(...bookings) {
  return { detailsBySlug: new Map(bookings.map((b, i) => [`slug-${i}`, b])) };
}

{
  const result = generateCustomerPortalLogistics(contextOf(detailBooking()), { now: NOW });

  assert.equal(result.schema_version, "jvto-booking/customer-portal-logistics-v1");
  assert.equal(result.generated_at, "2026-08-19T00:00:00.000Z");
  assert.equal(result.privacy, "Logistics values are operational booking fields. Customer identity and portal access slugs are excluded.");
  assert.equal(result.record_count, 1);

  const r = result.records[0];
  assert.deepEqual(r, {
    booking_id: 3453,
    booking_ref: "JVTO-3453",
    status: "booked",
    travel_date_start: "2026-08-11",
    travel_date_end: "2026-08-13",
    total_pax: 9,
    logistics: {
      pickup: "Surabaya Airport Terminal 2",
      pickup_time: "10:47:00",
      drop: "Gilimanuk Harbour",
      drop_time: "07:05:00",
      special_requirements_present: true,
    },
  });

  // seconds precision is preserved verbatim, never reformatted
  assert.equal(r.logistics.pickup_time, "10:47:00");
  assert.equal("special_requirements" in r.logistics, false, "free-form special requirements text must never be stored");
  assert.equal("customer_name" in r, false);
  assert.equal("package_name" in r, false);
}

{
  // whitespace-only / null special requirements => false; whitespace-only pickup text is kept verbatim
  const r = generateCustomerPortalLogistics(
    contextOf(detailBooking({ special_requirements: "   ", pickup: "  ", pickup_time: null, drop: "  ", drop_time: null })),
    { now: NOW },
  ).records[0];
  assert.equal(r.logistics.special_requirements_present, false);
  assert.equal(r.logistics.pickup, "  ");
  assert.equal(r.logistics.pickup_time, null);
  assert.equal(r.logistics.drop, "  ");
  assert.equal(r.logistics.drop_time, null);

  const rNull = generateCustomerPortalLogistics(contextOf(detailBooking({ special_requirements: null })), { now: NOW }).records[0];
  assert.equal(rNull.logistics.special_requirements_present, false);
}

{
  const result = generateCustomerPortalLogistics(
    contextOf(detailBooking({ id: 3999 }), detailBooking({ id: 1566 }), detailBooking({ id: 2700 })),
    { now: NOW },
  );
  assert.deepEqual(result.records.map((r) => r.booking_id), [1566, 2700, 3999]);
  assert.equal(result.record_count, 3);
}

console.log("customer-portal-logistics.test.mjs: all assertions passed");
