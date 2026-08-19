const SCHEMA_VERSION = "jvto-product/customer-portal-itinerary-records-v1";

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
