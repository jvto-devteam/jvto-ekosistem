const SCHEMA_VERSION = "jvto-booking/customer-portal-logistics-v1";
const PRIVACY_NOTE =
  "Logistics values are operational booking fields. Customer identity and portal access slugs are excluded.";

export function toLogistics(booking) {
  return {
    pickup: booking.pickup ?? null,
    pickup_time: booking.pickup_time ?? null,
    drop: booking.drop ?? null,
    drop_time: booking.drop_time ?? null,
    special_requirements_present: Boolean(booking.special_requirements?.trim()),
  };
}

function toLogisticsRecord(booking) {
  return {
    booking_id: booking.id,
    booking_ref: booking.booking_id,
    status: booking.status,
    travel_date_start: booking.travel_date_start,
    travel_date_end: booking.travel_date_end,
    total_pax: booking.total_pax,
    logistics: toLogistics(booking),
  };
}

export function generateCustomerPortalLogistics({ detailsBySlug }, { now = new Date() } = {}) {
  const records = [...detailsBySlug.values()]
    .map(toLogisticsRecord)
    .sort((a, b) => a.booking_id - b.booking_id);

  return {
    schema_version: SCHEMA_VERSION,
    generated_at: now.toISOString(),
    privacy: PRIVACY_NOTE,
    record_count: records.length,
    records,
  };
}
