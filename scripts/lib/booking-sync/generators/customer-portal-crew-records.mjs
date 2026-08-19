const SCHEMA_VERSION = "jvto-operations/customer-portal-crew-records-v1";
const PRIVACY_NOTE =
  "Crew names and public-facing roles/photos-present flags are retained; crew phone numbers are not present in the source portal payload and are not stored.";

function toCrewMember(member) {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    photo_present: Boolean(member.photo),
  };
}

export function toCrews(crews) {
  return {
    guides: (crews?.guides ?? []).map(toCrewMember),
    drivers: (crews?.drivers ?? []).map(toCrewMember),
  };
}

function toCrewRecord(booking) {
  return {
    booking_id: booking.id,
    booking_ref: booking.booking_id,
    package_name: booking.package_name,
    travel_date_start: booking.travel_date_start,
    crews: toCrews(booking.crews),
  };
}

export function generateCustomerPortalCrewRecords({ detailsBySlug }, { now = new Date() } = {}) {
  const records = [...detailsBySlug.values()]
    .map(toCrewRecord)
    .sort((a, b) => a.booking_id - b.booking_id);

  return {
    schema_version: SCHEMA_VERSION,
    generated_at: now.toISOString(),
    privacy: PRIVACY_NOTE,
    record_count: records.length,
    records,
  };
}
