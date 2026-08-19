import assert from "node:assert/strict";
import { generateBookingRecords } from "../../../lib/booking-sync/generators/booking-records.mjs";

const rawRecord = {
  booking_id: 3390,
  id: "JVTO-3390",
  orderChannel: "JVTO",
  guest_id: 3753,
  guestDetails: { country_id: 101, country: "Indonesia" },
  total_pax: 8,
  duration: "3D 2N",
  package_id: 29,
  package: "3 Day Ijen, Bromo & Madakaripura Waterfall Discovery from Surabaya",
  booking_date: "12 May 2026",
  date: { start_ymd: "2026-08-01", end_ymd: "2026-08-03", start: "01 Aug 26", end: "03 Aug 26", days: "Sat - Mon" },
  pickup: { meeting_point: "Surabaya Airport", meeting_point_arrival: "Terminal 2", meeting_point_value: "SQ922", pickup_time: "09:10", text: "Surabaya Airport Terminal 2 SQ922" },
  dropoff: { drop_point: "", drop_point_arrival: null, drop_point_value: null, drop_time: "07:00", text: "  " },
  itinerary: [{ day: 1, date: "01 Aug 2026", itinerary: "Surabaya Airport - Bromo Area" }],
  hotels: [{ day: 1, checkIn: "01 Aug 2026", hotelId: 17, hotel: "Jiwa Jawa Bromo", rooms: [], meals: [] }],
  tshirtSize: "XS x 1, M x 4",
  tshirtRaw: { xss: 0, xxs: 0, xs: 1, s: 0, m: 4, l: 1, xl: 2, xxl: 0, xxxl: 0 },
  vehicles: ["Hiace Commuter"],
  drivers: [{ id: 9, name: "GARAGE", tags: "TWT,JVTO,KLOOK", photo: "http://x/photo.jpg", recap_this_month_escort: 31 }],
  guides: [{ id: 4, name: "Taufik", type: "Escort", tags: "JVTO,KLOOK,TWT", photo: "http://x/photo.jpg", recap_this_month_escort: 5, recap_this_month_ijen: 2 }],
  is_shuttle: "NO",
  at_ijen: "02 Aug 26",
  financial: {
    payment: 20400000,
    balance: -2600000,
    paymentMethod: "cc",
    paymentMethodLink: "https://x/pay",
    invoice: { total: 17800000, invoiceLink: ["http://x/inv"] },
    expense: { total: 11800000, crew_expense: "11320000.00", debt_expense: "480000.00", expenseLink: "/x" },
    profit: -14400000,
  },
  paymentHistory: [{ id: 626, booking_id: 3390, nominal: 3990000, paymentMethodId: 3, paymentMethod: "Debit/Credit Card", description: "Down Payment", receipt: "RCP/1", reference: "http://x/ref", date: "12 May 26 12:37" }],
  notes: "- Upgrade ke Artotal (by client)",
};

{
  const result = generateBookingRecords({ overviewRecords: [rawRecord] });
  assert.equal(typeof result.privacy, "string");
  assert.equal(result.records.length, 1);
  const r = result.records[0];

  assert.equal(r.bookingId, 3390);
  assert.equal(r.bookingCode, "JVTO-3390");
  assert.equal(r.orderChannel, "JVTO");
  assert.equal(r.packageId, 29);
  assert.equal(r.duration, "3D 2N");
  assert.deepEqual(r.tripDate, rawRecord.date);

  assert.equal(r.pickup.meetingPoint, "Surabaya Airport");
  assert.equal(r.pickup.complete, true);
  assert.equal(r.dropoff.complete, false, "dropoff.text is whitespace-only, must be incomplete");

  assert.deepEqual(r.itinerary, rawRecord.itinerary);
  assert.deepEqual(r.hotels, rawRecord.hotels);
  assert.deepEqual(r.tshirt, { text: "XS x 1, M x 4", sizes: rawRecord.tshirtRaw });
  assert.deepEqual(r.vehicles, ["Hiace Commuter"]);

  assert.equal(r.drivers.length, 1);
  assert.equal(r.drivers[0].id, 9);
  assert.equal(r.drivers[0].monthlyEscortCount, 31);
  assert.equal("photo" in r.drivers[0], false, "photo must be dropped");

  assert.equal(r.guides.length, 1);
  assert.equal(r.guides[0].role, "Escort");
  assert.equal(r.guides[0].monthlyIjenCount, 2);
  assert.equal("photo" in r.guides[0], false, "photo must be dropped");

  assert.equal(r.isShuttle, "NO");
  assert.equal(r.ijenDate, "02 Aug 26");

  assert.deepEqual(r.customer, { guestId: 3753, countryId: 101, country: "Indonesia" });
  assert.equal("name" in r.customer, false, "guest name must never appear");

  assert.equal(r.payment.paid, 20400000);
  assert.equal(r.payment.invoiceTotal, 17800000);
  assert.equal(r.payment.balance, -2600000);
  assert.equal(r.payment.paymentMethod, "cc");
  assert.equal("paymentMethodLink" in r.payment, false);
  assert.equal(r.payment.history.length, 1);
  assert.equal(r.payment.history[0].amount, 3990000);
  assert.equal(r.payment.history[0].method, "Debit/Credit Card");
  assert.equal("receipt" in r.payment.history[0], false);
  assert.equal("reference" in r.payment.history[0], false);

  assert.deepEqual(r.readiness, {
    hasPickup: true,
    hasDropoff: false,
    hasVehicle: true,
    hasDriver: true,
    hasGuide: true,
    hasHotels: true,
    hasPaymentHistory: true,
    hasNotes: true,
    balanceStatus: "overpaid_or_adjustment",
  });
}

{
  const settled = { ...rawRecord, financial: { ...rawRecord.financial, balance: 0 } };
  const dueOnly = { ...rawRecord, financial: { ...rawRecord.financial, balance: 500000 } };
  const result = generateBookingRecords({ overviewRecords: [settled, dueOnly] });
  assert.equal(result.records[0].readiness.balanceStatus, "settled");
  assert.equal(result.records[1].readiness.balanceStatus, "balance_due");
}

{
  const a = { ...rawRecord, booking_id: 1, date: { ...rawRecord.date, start_ymd: "2026-08-05" } };
  const b = { ...rawRecord, booking_id: 2, date: { ...rawRecord.date, start_ymd: "2026-08-01" } };
  const result = generateBookingRecords({ overviewRecords: [a, b] });
  assert.deepEqual(result.records.map((r) => r.bookingId), [2, 1], "must sort ascending by tripDate.start_ymd");
}

{
  // A malformed record (missing/null `date`) must not throw in the sort comparator. A throw
  // here aborts runGenerators after sync-booking-data.mjs has already written the archive but
  // before anything is committed, so every subsequent scheduled run re-reads the same state
  // and crashes identically — a permanent stall. Degenerate ordering is fine; throwing is not.
  const nullDate = { ...rawRecord, booking_id: 10, date: null };
  const missingDate = { ...rawRecord, booking_id: 11 };
  delete missingDate.date;
  const normalLate = { ...rawRecord, booking_id: 12, date: { ...rawRecord.date, start_ymd: "2026-09-01" } };
  const normalEarly = { ...rawRecord, booking_id: 13, date: { ...rawRecord.date, start_ymd: "2026-08-01" } };

  let result;
  assert.doesNotThrow(() => {
    result = generateBookingRecords({ overviewRecords: [normalLate, nullDate, normalEarly, missingDate] });
  }, "a record without a usable tripDate.start_ymd must not throw");

  assert.equal(result.records.length, 4);
  assert.deepEqual(
    result.records.map((r) => r.bookingId).slice(2),
    [13, 12],
    "well-formed records keep their ascending start_ymd order"
  );
  assert.deepEqual(
    result.records.map((r) => r.bookingId).slice(0, 2).sort((x, y) => x - y),
    [10, 11],
    "records with no start_ymd sort to the front (empty string sorts first)"
  );
  assert.equal(result.records[0].tripDate ?? null, null);
}

console.log("booking-records.test.mjs: all assertions passed");
