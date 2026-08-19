import assert from "node:assert/strict";
import { fetchBookingOverviewMonth, fetchCustomerPortalDetail } from "../../lib/booking-sync/fetch.mjs";

function fakeResponse({ ok = true, status = 200, statusText = "OK", headers = {}, body = {} } = {}) {
  return {
    ok,
    status,
    statusText,
    headers: { entries: () => Object.entries(headers) },
    json: async () => body,
  };
}

{
  let capturedUrl = null;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return fakeResponse({ headers: { "content-type": "application/json" }, body: [{ booking_id: 1 }] });
  };
  const result = await fetchBookingOverviewMonth("2026-08", { fetchImpl });
  assert.equal(
    capturedUrl,
    "https://new-backoffice.javavolcano-touroperator.com/booking-overview/api?json=true&filter_type=month&month=2026-08"
  );
  assert.deepEqual(result.records, [{ booking_id: 1 }]);
  assert.equal(result.headers, "content-type: application/json");
}

{
  const fetchImpl = async () => fakeResponse({ ok: false, status: 500, statusText: "Server Error" });
  await assert.rejects(() => fetchBookingOverviewMonth("2026-08", { fetchImpl }), /500/);
}

{
  let capturedUrl = null;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return fakeResponse({ body: { success: true, booking: { booking_id: 1 } } });
  };
  const result = await fetchCustomerPortalDetail("abc123", { fetchImpl });
  assert.equal(capturedUrl, "https://legacy.javavolcano-touroperator.com/bookings/details/abc123?json=true");
  assert.equal(result.slug, "abc123");
  assert.equal(result.ok, true);
  assert.equal(result.statusCode, 200);
  assert.equal(result.error, null);
  assert.deepEqual(result.json, { success: true, booking: { booking_id: 1 } });
}

{
  const fetchImpl = async () => fakeResponse({ ok: false, status: 404, statusText: "Not Found", body: null });
  const result = await fetchCustomerPortalDetail("missing-slug", { fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 404);
  assert.equal(result.slug, "missing-slug");
}

console.log("fetch.test.mjs: all assertions passed");
