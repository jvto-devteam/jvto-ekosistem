const SCHEMA_VERSION = "jvto-operations/customer-portal-vehicle-records-v1";

export function toVehicles(vehicleSpecs) {
  return (vehicleSpecs ?? []).map((v) => ({
    name: v.name,
    capacity: v.capacity,
    banner_present: Boolean(v.banner),
    interior_image_count: (v.interior ?? []).length,
  }));
}

function toVehicleRecord(booking) {
  return {
    booking_id: booking.id,
    booking_ref: booking.booking_id,
    package_name: booking.package_name,
    total_pax: booking.total_pax,
    vehicles: toVehicles(booking.vehicle_specs),
  };
}

export function generateCustomerPortalVehicleRecords({ detailsBySlug }, { now = new Date() } = {}) {
  const records = [...detailsBySlug.values()]
    .map(toVehicleRecord)
    .sort((a, b) => a.booking_id - b.booking_id);

  // NOTE: this output deliberately has no `privacy` key, matching the original hand-written file.
  return {
    schema_version: SCHEMA_VERSION,
    generated_at: now.toISOString(),
    record_count: records.length,
    records,
  };
}
