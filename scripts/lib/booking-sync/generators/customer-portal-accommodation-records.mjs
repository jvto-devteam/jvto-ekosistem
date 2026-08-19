const SCHEMA_VERSION = "jvto-operations/customer-portal-accommodations-v1";

export function toAccommodations(accommodations) {
  // source order is preserved verbatim — it is not always day-ascending, and consumers rely on it
  return (accommodations ?? []).map((a) => ({
    day: a.day,
    name: a.name,
    rooms: a.rooms,
    banner_present: Boolean(a.banner),
  }));
}

function toAccommodationRecord(booking) {
  return {
    booking_id: booking.id,
    booking_ref: booking.booking_id,
    package_name: booking.package_name,
    travel_date_start: booking.travel_date_start,
    accommodations: toAccommodations(booking.accommodations),
  };
}

export function generateCustomerPortalAccommodationRecords({ detailsBySlug }, { now = new Date() } = {}) {
  const records = [...detailsBySlug.values()]
    .map(toAccommodationRecord)
    .sort((a, b) => a.booking_id - b.booking_id);

  // NOTE: this output deliberately has no `privacy` key, matching the original hand-written file.
  return {
    schema_version: SCHEMA_VERSION,
    generated_at: now.toISOString(),
    record_count: records.length,
    records,
  };
}
