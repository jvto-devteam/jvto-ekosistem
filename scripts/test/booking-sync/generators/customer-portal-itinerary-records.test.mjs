import assert from "node:assert/strict";
import { generateCustomerPortalItineraryRecords } from "../../../lib/booking-sync/generators/customer-portal-itinerary-records.mjs";

const NOW = new Date("2026-08-19T00:00:00.000Z");

function detailBooking(overrides = {}) {
  return {
    id: 3453,
    booking_id: "JVTO-3453",
    booking_code: "JVR/027/08/26",
    status: "booked",
    customer_name: "Jane Doe",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    duration: "3D 2N",
    travel_date_start: "2026-08-11",
    itineraries: [
      { day: 1, title: "Day 1", itinerary: "Surabaya City - Bromo Area", activity: "Pick up from Surabaya City - Transfer to hotel." },
      { day: 2, title: "Day 2", itinerary: "Bromo Sunrise", activity: "Depart at 2am  by  private jeep   to Bromo" },
    ],
    ...overrides,
  };
}

function contextOf(...bookings) {
  return { detailsBySlug: new Map(bookings.map((b, i) => [`slug-${i}`, b])) };
}

{
  const result = generateCustomerPortalItineraryRecords(contextOf(detailBooking()), { now: NOW });

  assert.equal(result.schema_version, "jvto-product/customer-portal-itinerary-records-v1");
  assert.equal(result.generated_at, "2026-08-19T00:00:00.000Z");
  assert.equal(result.record_count, 1);
  assert.equal("privacy" in result, false, "this output deliberately carries no privacy key");

  const r = result.records[0];
  assert.deepEqual(r, {
    booking_id: 3453,
    booking_ref: "JVTO-3453",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    duration: "3D 2N",
    itinerary_days: [
      { day: 1, title: "Day 1", itinerary: "Surabaya City - Bromo Area", activity_text: "Pick up from Surabaya City - Transfer to hotel." },
      { day: 2, title: "Day 2", itinerary: "Bromo Sunrise", activity_text: "Depart at 2am by private jeep to Bromo" },
    ],
  });

  // the rename happened: no `activity`, and runs of 2+ spaces collapsed to a single space
  assert.equal("activity" in r.itinerary_days[1], false);
  assert.equal(r.itinerary_days[1].activity_text, "Depart at 2am by private jeep to Bromo");
  assert.equal("customer_name" in r, false);
  assert.equal("itineraries" in r, false);
}

{
  // missing / empty itineraries must not throw
  const r = generateCustomerPortalItineraryRecords(contextOf(detailBooking({ itineraries: undefined })), { now: NOW }).records[0];
  assert.deepEqual(r.itinerary_days, []);

  const rNullActivity = generateCustomerPortalItineraryRecords(
    contextOf(detailBooking({ itineraries: [{ day: 1, title: "Day 1", itinerary: "X", activity: null }] })),
    { now: NOW },
  ).records[0];
  assert.equal(rNullActivity.itinerary_days[0].activity_text, null);
}

{
  const result = generateCustomerPortalItineraryRecords(
    contextOf(detailBooking({ id: 3999 }), detailBooking({ id: 1566 }), detailBooking({ id: 2700 })),
    { now: NOW },
  );
  assert.deepEqual(result.records.map((r) => r.booking_id), [1566, 2700, 3999]);
  assert.equal(result.record_count, 3);
}

console.log("customer-portal-itinerary-records.test.mjs: all assertions passed");
