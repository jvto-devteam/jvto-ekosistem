const SCHEMA_VERSION = "jvto-product/customer-portal-itinerary-records-v1";

// PRIVACY CAVEAT (accepted residual risk, documented deliberately):
// `activity_text` is unstructured free text typed by ops staff. Some bookings carry
// flight-coordination details in it, e.g. "Flight details: TR296 (0820hr SIN - 0950hr SUB)
// x 1 (<passenger name>)" — i.e. passenger names and flight numbers/times. It is
// deliberately NOT scrubbed: any text-matching heuristic would be unreliable and would
// mangle legitimate activity descriptions. Unlike the structured fields, this field is not
// guaranteed PII-free. Consumers of BOTH outputs built from this helper
// (customer-portal-itinerary-records.json and customer-portal-detail-records.json) must
// treat it accordingly; the repo storing these outputs is private, not public.
// Note: this output intentionally carries no top-level `privacy` key (plan §4c: "do not add
// one"), so the caveat is recorded here in source and in detail-records' PRIVACY_NOTE.
export function toItineraryDays(itineraries) {
  return (itineraries ?? []).map((day) => ({
    day: day.day,
    title: day.title,
    itinerary: day.itinerary,
    // rename `activity` -> `activity_text` and collapse any run of 2+ whitespace chars to one space
    activity_text: day.activity == null ? null : day.activity.replace(/\s{2,}/g, " "),
  }));
}

function toItineraryRecord(booking) {
  return {
    booking_id: booking.id,
    booking_ref: booking.booking_id,
    package_name: booking.package_name,
    duration: booking.duration,
    itinerary_days: toItineraryDays(booking.itineraries),
  };
}

export function generateCustomerPortalItineraryRecords({ detailsBySlug }, { now = new Date() } = {}) {
  const records = [...detailsBySlug.values()]
    .map(toItineraryRecord)
    .sort((a, b) => a.booking_id - b.booking_id);

  // NOTE: this output deliberately has no `privacy` key, matching the original hand-written file.
  return {
    schema_version: SCHEMA_VERSION,
    generated_at: now.toISOString(),
    record_count: records.length,
    records,
  };
}
