import assert from "node:assert/strict";
import { hashBookingRecord, diffManifest, extractSlug } from "../../lib/booking-sync/manifest.mjs";

{
  const a = { booking_id: 1, guest: "A", date: { start: "x", end: "y" } };
  const b = { date: { end: "y", start: "x" }, guest: "A", booking_id: 1 };
  assert.equal(hashBookingRecord(a), hashBookingRecord(b));
}

{
  const a = { booking_id: 1, guest: "A" };
  const b = { booking_id: 1, guest: "B" };
  assert.notEqual(hashBookingRecord(a), hashBookingRecord(b));
}

{
  assert.equal(extractSlug("https://x/my-booking/abc123"), "abc123");
  assert.equal(extractSlug("https://x/my-booking/abc123/"), "abc123");
  assert.equal(extractSlug(null), null);
  assert.equal(extractSlug(undefined), null);
}

{
  const recordOne = { booking_id: 1, guest: "A", customer_portal: "https://x/my-booking/slug-1" };
  const recordTwoOld = { booking_id: 2, guest: "B", customer_portal: "https://x/my-booking/slug-2" };
  const previous = {
    "1": { hash: hashBookingRecord(recordOne), slug: "slug-1" },
    "2": { hash: hashBookingRecord(recordTwoOld), slug: "slug-2" },
  };
  const current = [
    recordOne,
    { booking_id: 2, guest: "B-changed", customer_portal: "https://x/my-booking/slug-2" },
    { booking_id: 3, guest: "C", customer_portal: "https://x/my-booking/slug-3" },
  ];
  const diff = diffManifest(previous, current);
  assert.deepEqual(diff.added, ["3"]);
  assert.deepEqual(diff.updated, ["2"]);
  assert.deepEqual(diff.unchanged, ["1"]);
  assert.deepEqual(diff.removed, []);
  assert.equal(diff.manifest["3"].slug, "slug-3");
  assert.equal(diff.manifest["1"].hash, previous["1"].hash);
}

{
  const previous = { "9": { hash: "whatever", slug: "slug-9" } };
  const diff = diffManifest(previous, []);
  assert.deepEqual(diff.removed, ["9"]);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.manifest, {});
}

console.log("manifest.test.mjs: all assertions passed");
