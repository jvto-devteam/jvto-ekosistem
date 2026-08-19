const SCHEMA_VERSION = "jvto-experience/portal-knowledge-feed-v1";
const SOURCE = "compiled from customer portal detail payloads";

// Map/readdir iteration order is not guaranteed stable, so every dedup below traverses
// bookings in booking_id-ascending order (slug as tie-break) to stay deterministic.
function sortedBookings(detailsBySlug) {
  return [...detailsBySlug.entries()]
    .sort(([slugA, a], [slugB, b]) => (a.id ?? 0) - (b.id ?? 0) || (slugA < slugB ? -1 : slugA > slugB ? 1 : 0))
    .map(([, booking]) => booking);
}

function packingEntries(packingRecommendations) {
  if (Array.isArray(packingRecommendations)) return packingRecommendations.map((p) => [p.category, p.items]);
  return Object.entries(packingRecommendations ?? {});
}

function collectFaqs(bookings) {
  // key -> {category, question, answers: Map<answer, {count, lowestBookingId}>}
  const pairs = new Map();
  for (const booking of bookings) {
    for (const [category, questions] of Object.entries(booking.faq ?? {})) {
      for (const [question, answer] of Object.entries(questions ?? {})) {
        const key = JSON.stringify([category, question]);
        const pair = pairs.get(key) ?? { category, question, answers: new Map() };
        const tally = pair.answers.get(answer) ?? { count: 0, lowestBookingId: booking.id };
        tally.count += 1;
        tally.lowestBookingId = Math.min(tally.lowestBookingId, booking.id);
        pair.answers.set(answer, tally);
        pairs.set(key, pair);
      }
    }
  }

  return [...pairs.values()].map(({ category, question, answers }) => {
    // majority vote; on a tie the answer belonging to the lowest booking_id wins
    const [answer] = [...answers.entries()].reduce((best, current) =>
      current[1].count > best[1].count || (current[1].count === best[1].count && current[1].lowestBookingId < best[1].lowestBookingId)
        ? current
        : best,
    );
    return { category, question, answer };
  });
}

function collectPackingRecommendations(bookings) {
  // deduped by category; the first items[] seen wins (verified byte-identical across bookings)
  const byCategory = new Map();
  for (const booking of bookings) {
    for (const [category, items] of packingEntries(booking.packing_recommendations)) {
      if (!byCategory.has(category)) byCategory.set(category, items);
    }
  }
  return [...byCategory.entries()].map(([category, items]) => ({ category, items }));
}

function collectEssentialChecklist(bookings) {
  // deduped by item text; the source's `checked` flag is dropped entirely
  const items = new Set();
  for (const booking of bookings) {
    for (const entry of booking.essential_checklist ?? []) items.add(entry.item);
  }
  return [...items].map((item) => ({ item }));
}

export function generateCustomerPortalFaqPackingFeed({ detailsBySlug }, { now = new Date() } = {}) {
  const bookings = sortedBookings(detailsBySlug);
  const faqs = collectFaqs(bookings);
  const packingRecommendations = collectPackingRecommendations(bookings);
  const essentialChecklist = collectEssentialChecklist(bookings);

  // NOTE: this output deliberately has no `privacy` key, matching the original hand-written file.
  return {
    schema_version: SCHEMA_VERSION,
    generated_at: now.toISOString(),
    source: SOURCE,
    faq_count: faqs.length,
    packing_category_count: packingRecommendations.length,
    checklist_item_count: essentialChecklist.length,
    faqs,
    packing_recommendations: packingRecommendations,
    essential_checklist: essentialChecklist,
  };
}
