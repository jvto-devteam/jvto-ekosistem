import { createHash } from "node:crypto";
import { toProduct, toFinance } from "./customer-portal-booking-details.mjs";
import { toLogistics } from "./customer-portal-logistics.mjs";
import { toItineraryDays } from "./customer-portal-itinerary-records.mjs";
import { toAccommodations } from "./customer-portal-accommodation-records.mjs";
import { toCrews } from "./customer-portal-crew-records.mjs";
import { toVehicles } from "./customer-portal-vehicle-records.mjs";

const SCHEMA_VERSION = "jvto-experience-output/customer-portal-detail-records-v1";
const SOURCE = "legacy customer portal details, sanitized from /bookings/details/{portal_slug}?json=true";
// The caveat below is a documented, accepted residual risk: `itinerary_days[].activity_text`
// is unstructured free text typed by ops staff and sometimes carries flight-coordination
// details (passenger names, flight numbers/times). It is deliberately NOT scrubbed — any
// text-matching heuristic would be unreliable and would mangle legitimate activity
// descriptions — so the privacy note states the limit honestly instead of overclaiming.
const PRIVACY_NOTE =
  "Customer name, customer id, portal slug, payment links, uploaded proofs, media URLs, and payment references are excluded from this active file. Exception: the free-text itinerary activity field (itinerary_days[].activity_text) is operational text entered by ops staff and may contain coordination details such as passenger names or flight numbers/times; unlike the structured fields, it is not guaranteed to be PII-free.";

function portalRecordId(slug) {
  // one-way pseudonym: the raw portal slug is an access credential and is never stored
  return `portal_${createHash("sha256").update(slug).digest("hex").slice(0, 16)}`;
}

export function packingCategories(packingRecommendations) {
  if (Array.isArray(packingRecommendations)) return packingRecommendations.map((p) => p.category);
  return Object.keys(packingRecommendations ?? {});
}

function toPortalContent(booking) {
  return {
    faq_categories: Object.keys(booking.faq ?? {}),
    packing_categories: packingCategories(booking.packing_recommendations),
    // `checked` is always false: the source's own value is not meaningful state
    essential_checklist: (booking.essential_checklist ?? []).map((entry) => ({ item: entry.item, checked: false })),
    media_link_present: (booking.media_link ?? null) != null,
  };
}

function toDetailRecord(slug, booking) {
  return {
    booking_id: booking.id,
    booking_ref: booking.booking_id,
    booking_code: booking.booking_code,
    channel: booking.channel,
    status: booking.status,
    portal_record_id: portalRecordId(slug),
    privacy: PRIVACY_NOTE,
    product: toProduct(booking),
    logistics: toLogistics(booking),
    tshirt_sizes: booking.tshirt_sizes,
    itinerary_days: toItineraryDays(booking.itineraries),
    accommodations: toAccommodations(booking.accommodations),
    addons: booking.addons ?? [],
    crews: toCrews(booking.crews),
    vehicles: toVehicles(booking.vehicle_specs),
    finance: toFinance(booking.finance),
    portal_content: toPortalContent(booking),
  };
}

export function generateCustomerPortalDetailRecords({ detailsBySlug }, { now = new Date() } = {}) {
  const records = [...detailsBySlug.entries()]
    .map(([slug, booking]) => toDetailRecord(slug, booking))
    .sort((a, b) => a.booking_id - b.booking_id);

  return {
    schema_version: SCHEMA_VERSION,
    generated_at: now.toISOString(),
    source: SOURCE,
    record_count: records.length,
    records,
  };
}
