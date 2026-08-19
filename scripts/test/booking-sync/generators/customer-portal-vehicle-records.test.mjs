import assert from "node:assert/strict";
import { generateCustomerPortalVehicleRecords } from "../../../lib/booking-sync/generators/customer-portal-vehicle-records.mjs";

const NOW = new Date("2026-08-19T00:00:00.000Z");

function detailBooking(overrides = {}) {
  return {
    id: 3453,
    booking_id: "JVTO-3453",
    customer_name: "Jane Doe",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    travel_date_start: "2026-08-11",
    total_pax: 9,
    vehicle_specs: [
      {
        name: "Hiace Commuter",
        capacity: "4 - 0 pax",
        banner: "https://example.test/hiace.png",
        interior: ["https://example.test/h1.png", "https://example.test/h2.jpg", "https://example.test/h3.jpg"],
      },
      { name: "MPV", capacity: "1 - 3 pax", banner: null, interior: null },
    ],
    ...overrides,
  };
}

function contextOf(...bookings) {
  return { detailsBySlug: new Map(bookings.map((b, i) => [`slug-${i}`, b])) };
}

{
  const result = generateCustomerPortalVehicleRecords(contextOf(detailBooking()), { now: NOW });

  assert.equal(result.schema_version, "jvto-operations/customer-portal-vehicle-records-v1");
  assert.equal(result.generated_at, "2026-08-19T00:00:00.000Z");
  assert.equal(result.record_count, 1);
  assert.equal("privacy" in result, false, "this output deliberately carries no privacy key");

  const r = result.records[0];
  assert.deepEqual(r, {
    booking_id: 3453,
    booking_ref: "JVTO-3453",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    total_pax: 9,
    vehicles: [
      { name: "Hiace Commuter", capacity: "4 - 0 pax", banner_present: true, interior_image_count: 3 },
      { name: "MPV", capacity: "1 - 3 pax", banner_present: false, interior_image_count: 0 },
    ],
  });

  assert.equal("banner" in r.vehicles[0], false, "raw banner URL must never be stored");
  assert.equal("interior" in r.vehicles[0], false, "raw interior image URLs must never be stored");
  assert.equal("customer_name" in r, false);
  assert.equal("travel_date_start" in r, false);
}

{
  const r = generateCustomerPortalVehicleRecords(contextOf(detailBooking({ vehicle_specs: undefined })), { now: NOW }).records[0];
  assert.deepEqual(r.vehicles, []);
}

{
  const result = generateCustomerPortalVehicleRecords(
    contextOf(detailBooking({ id: 3999 }), detailBooking({ id: 1566 }), detailBooking({ id: 2700 })),
    { now: NOW },
  );
  assert.deepEqual(result.records.map((r) => r.booking_id), [1566, 2700, 3999]);
  assert.equal(result.record_count, 3);
}

console.log("customer-portal-vehicle-records.test.mjs: all assertions passed");
