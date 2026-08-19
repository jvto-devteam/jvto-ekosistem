import assert from "node:assert/strict";
import { generateGuestPortalRecords } from "../../../lib/booking-sync/generators/guest-portal-records.mjs";

function rawRecord(overrides = {}) {
  return {
    booking_id: 3390,
    id: "JVTO-3390",
    package: "3 Day Ijen, Bromo & Madakaripura Waterfall Discovery from Surabaya",
    date: { start_ymd: "2026-08-01", end_ymd: "2026-08-03", start: "01 Aug 26", end: "03 Aug 26", days: "Sat - Mon" },
    pickup: { meeting_point: "Surabaya Airport", meeting_point_arrival: "Terminal 2", meeting_point_value: "SQ922", pickup_time: "09:10", text: "Surabaya Airport Terminal 2 SQ922" },
    dropoff: { drop_point: "", drop_point_arrival: null, drop_point_value: null, drop_time: "07:00", text: "  " },
    itinerary: [{ day: 1, itinerary: "x" }],
    hotels: [{ day: 1, hotel: "Jiwa Jawa Bromo" }],
    tshirtSize: "XS x 1",
    tshirtRaw: { xss: 0, xxs: 0, xs: 1, s: 0, m: 0, l: 0, xl: 0, xxl: 0, xxxl: 0 },
    vehicles: ["Hiace Commuter"],
    drivers: [{ id: 1, name: "Someone" }],
    guides: [{ id: 2, name: "Someone Else" }],
    financial: { payment: 20400000, balance: -2600000, invoice: { total: 17800000 }, profit: -14400000, expense: { total: 11800000 } },
    ...overrides,
  };
}

{
  const result = generateGuestPortalRecords({ overviewRecords: [rawRecord()] });
  assert.equal(typeof result.privacy, "string");
  const r = result.records[0];

  assert.equal(r.bookingId, 3390);
  assert.equal(r.bookingCode, "JVTO-3390");
  assert.equal(r.packageName, rawRecord().package);
  assert.deepEqual(r.tripDate, rawRecord().date);
  assert.equal(r.pickup.complete, true);
  assert.equal(r.dropoff.complete, false);
  assert.deepEqual(r.vehicles, ["Hiace Commuter"]);

  assert.equal("drivers" in r, false, "crew/driver data must be entirely omitted");
  assert.equal("guides" in r, false, "crew/guide data must be entirely omitted");

  assert.deepEqual(r.payment, { invoiceTotal: 17800000, paid: 20400000, balance: -2600000 });
  assert.equal("profit" in r.payment, false);
  assert.equal("expense" in r.payment, false);

  assert.deepEqual(r.readiness, { hasPickup: true, hasDropoff: false, hasHotels: true, balanceStatus: "overpaid_or_adjustment" });
  assert.equal("hasVehicle" in r.readiness, false);
  assert.equal("hasDriver" in r.readiness, false);
  assert.equal("hasGuide" in r.readiness, false);
}

{
  // meeting_point_value present but text missing entirely -> still incomplete;
  // this confirms `complete` is driven by meeting_point + value, not by `text`
  const rec = rawRecord({ pickup: { meeting_point: "Surabaya Airport", meeting_point_value: null, pickup_time: "09:10", text: "Surabaya Airport" } });
  const result = generateGuestPortalRecords({ overviewRecords: [rec] });
  assert.equal(result.records[0].pickup.complete, false);
  assert.equal(result.records[0].readiness.hasPickup, false);
}

console.log("guest-portal-records.test.mjs: all assertions passed");
