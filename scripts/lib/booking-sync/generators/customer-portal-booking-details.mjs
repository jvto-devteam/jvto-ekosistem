const SCHEMA_VERSION = "jvto-booking/customer-portal-booking-details-v1";
const PRIVACY_NOTE =
  "No customer names, contact details, portal slugs, payment links, media links, payment references, or uploaded proof URLs are stored.";

export function toProduct(booking) {
  return {
    package_name: booking.package_name,
    package_link: booking.package_link,
    duration: booking.duration,
    travel_date_start: booking.travel_date_start,
    travel_date_end: booking.travel_date_end,
    total_pax: booking.total_pax,
  };
}

export function toFinance(finance) {
  return {
    // grand_total is computed: the raw finance.grand_total is unreliable (often duplicates dp_amount)
    grand_total: (finance?.dp_amount ?? 0) + (finance?.balance ?? 0),
    total_addons: finance?.total_addons ?? null,
    dp_amount: finance?.dp_amount ?? null,
    balance: finance?.balance ?? null,
    paid_amount: finance?.paid_amount ?? null,
    due_date: finance?.due_date ?? null,
    initial_payment_method: finance?.initial_payment_method ?? null,
    balance_payment_method: finance?.balance_payment_method ?? null,
    payment_link_present: (finance?.payment_link ?? null) != null,
    pending_upload_proof: finance?.pending_upload_proof ?? null,
    uploaded_payment_proof_present: (finance?.uploaded_payment_proof ?? null) != null,
    payment_history: (finance?.payment_history ?? []).map((p) => ({
      id: p.id,
      nominal: p.nominal,
      description: p.description,
      method: p.method,
      created_at: p.created_at,
      reference_present: (p.reference ?? null) != null,
    })),
  };
}

function toBookingDetailRecord(booking) {
  return {
    booking_id: booking.id,
    booking_ref: booking.booking_id,
    booking_code: booking.booking_code,
    channel: booking.channel,
    status: booking.status,
    product: toProduct(booking),
    tshirt_sizes: booking.tshirt_sizes,
    addons: booking.addons ?? [],
    finance: toFinance(booking.finance),
  };
}

export function generateCustomerPortalBookingDetails({ detailsBySlug }, { now = new Date() } = {}) {
  const records = [...detailsBySlug.values()]
    .map(toBookingDetailRecord)
    .sort((a, b) => a.booking_id - b.booking_id);

  return {
    schema_version: SCHEMA_VERSION,
    generated_at: now.toISOString(),
    privacy: PRIVACY_NOTE,
    record_count: records.length,
    records,
  };
}
