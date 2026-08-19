import { createHash } from "node:crypto";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

export function hashBookingRecord(record) {
  const canonical = JSON.stringify(canonicalize(record));
  return createHash("sha256").update(canonical).digest("hex");
}

export function extractSlug(customerPortalUrl) {
  if (!customerPortalUrl) return null;
  const parts = customerPortalUrl.split("/").filter(Boolean);
  return parts.at(-1) ?? null;
}

export function diffManifest(previousManifest, currentRecords) {
  const added = [];
  const updated = [];
  const unchanged = [];
  const nextManifest = {};
  const seenIds = new Set();

  for (const record of currentRecords) {
    const bookingId = String(record.booking_id);
    seenIds.add(bookingId);
    const hash = hashBookingRecord(record);
    const slug = extractSlug(record.customer_portal);
    nextManifest[bookingId] = { hash, slug };

    const previous = previousManifest[bookingId];
    if (!previous) {
      added.push(bookingId);
    } else if (previous.hash !== hash) {
      updated.push(bookingId);
    } else {
      unchanged.push(bookingId);
    }
  }

  const removed = Object.keys(previousManifest).filter((id) => !seenIds.has(id));

  return { added, removed, updated, unchanged, manifest: nextManifest };
}
