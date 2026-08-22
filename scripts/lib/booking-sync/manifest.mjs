/**
 * booking-sync/manifest.mjs (REFACTORED)
 * 
 * Now uses shared change-tracker module.
 * Maintains backward compatibility with original API.
 */

import { hashRecord, diffManifest as diffManifestShared, canonicalize } from "../shared/change-tracker.mjs";

/**
 * Backward compatibility: hashBookingRecord -> hashRecord
 */
export function hashBookingRecord(record) {
  return hashRecord(record);
}

/**
 * Extract slug from customer portal URL.
 */
export function extractSlug(customerPortalUrl) {
  if (!customerPortalUrl) return null;
  const parts = customerPortalUrl.split("/").filter(Boolean);
  return parts.at(-1) ?? null;
}

/**
 * Diff booking manifests using shared module.
 * 
 * Wrapper that adapts shared diffManifest to booking-specific format:
 * - Uses "booking_id" as ID field
 * - Extracts slug as metadata
 */
export function diffManifest(previousManifest, currentRecords) {
  return diffManifestShared(previousManifest, currentRecords, {
    idField: "booking_id",
    hashFn: hashRecord,
    metadataFn: (record) => ({
      slug: extractSlug(record.customer_portal),
    }),
  });
}

/**
 * Export canonicalize for direct use if needed.
 */
export { canonicalize };
