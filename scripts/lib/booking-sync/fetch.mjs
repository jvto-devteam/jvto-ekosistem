const BOOKING_OVERVIEW_BASE = "https://new-backoffice.javavolcano-touroperator.com/booking-overview/api";
const CUSTOMER_PORTAL_DETAIL_BASE = "https://legacy.javavolcano-touroperator.com/bookings/details";

export async function fetchBookingOverviewMonth(month, { fetchImpl = fetch } = {}) {
  const url = `${BOOKING_OVERVIEW_BASE}?json=true&filter_type=month&month=${month}`;
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`fetchBookingOverviewMonth: ${response.status} ${response.statusText} for month=${month}`);
  }
  const records = await response.json();
  const headers = [...response.headers.entries()].map(([key, value]) => `${key}: ${value}`).join("\n");
  return { records, headers };
}

export async function fetchCustomerPortalDetail(slug, { fetchImpl = fetch } = {}) {
  const url = `${CUSTOMER_PORTAL_DETAIL_BASE}/${slug}?json=true`;
  const response = await fetchImpl(url);
  let json = null;
  let error = null;
  try {
    json = await response.json();
  } catch (err) {
    error = err.message;
  }
  return { slug, url, statusCode: response.status, ok: response.ok, error, json };
}
