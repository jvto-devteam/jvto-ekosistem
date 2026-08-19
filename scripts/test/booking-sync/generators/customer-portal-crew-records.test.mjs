import assert from "node:assert/strict";
import { generateCustomerPortalCrewRecords } from "../../../lib/booking-sync/generators/customer-portal-crew-records.mjs";

const NOW = new Date("2026-08-19T00:00:00.000Z");

function detailBooking(overrides = {}) {
  return {
    id: 3453,
    booking_id: "JVTO-3453",
    customer_name: "Jane Doe",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    travel_date_start: "2026-08-11",
    crews: {
      guides: [
        { id: 4, name: "Taufik", photo: "https://example.test/taufik.jpg", role: "Escort Guide" },
        { id: 2, name: "Juan", photo: null, role: "Ijen Guide" },
      ],
      drivers: [{ id: 62, name: "Yusuf", photo: "https://example.test/yusuf.jpg", role: "Driver" }],
    },
    ...overrides,
  };
}

function contextOf(...bookings) {
  return { detailsBySlug: new Map(bookings.map((b, i) => [`slug-${i}`, b])) };
}

{
  const result = generateCustomerPortalCrewRecords(contextOf(detailBooking()), { now: NOW });

  assert.equal(result.schema_version, "jvto-operations/customer-portal-crew-records-v1");
  assert.equal(result.generated_at, "2026-08-19T00:00:00.000Z");
  assert.equal(
    result.privacy,
    "Crew names and public-facing roles/photos-present flags are retained; crew phone numbers are not present in the source portal payload and are not stored.",
  );
  assert.equal(result.record_count, 1);

  const r = result.records[0];
  assert.deepEqual(r, {
    booking_id: 3453,
    booking_ref: "JVTO-3453",
    package_name: "3 Day Bromo, Madakaripura Waterfall & Ijen Overland",
    travel_date_start: "2026-08-11",
    crews: {
      guides: [
        { id: 4, name: "Taufik", role: "Escort Guide", photo_present: true },
        { id: 2, name: "Juan", role: "Ijen Guide", photo_present: false },
      ],
      drivers: [{ id: 62, name: "Yusuf", role: "Driver", photo_present: true }],
    },
  });

  assert.equal("photo" in r.crews.guides[0], false, "raw crew photo URL must never be stored");
  assert.equal("photo" in r.crews.drivers[0], false, "raw crew photo URL must never be stored");
  assert.equal("customer_name" in r, false);
}

{
  // missing crews block / empty arrays must not throw
  const r = generateCustomerPortalCrewRecords(contextOf(detailBooking({ crews: undefined })), { now: NOW }).records[0];
  assert.deepEqual(r.crews, { guides: [], drivers: [] });

  const rEmpty = generateCustomerPortalCrewRecords(contextOf(detailBooking({ crews: { guides: [], drivers: [] } })), { now: NOW }).records[0];
  assert.deepEqual(rEmpty.crews, { guides: [], drivers: [] });
}

{
  const result = generateCustomerPortalCrewRecords(
    contextOf(detailBooking({ id: 3999 }), detailBooking({ id: 1566 }), detailBooking({ id: 2700 })),
    { now: NOW },
  );
  assert.deepEqual(result.records.map((r) => r.booking_id), [1566, 2700, 3999]);
  assert.equal(result.record_count, 3);
}

console.log("customer-portal-crew-records.test.mjs: all assertions passed");
