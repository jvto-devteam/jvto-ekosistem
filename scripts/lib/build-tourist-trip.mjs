import { ORG_ID } from "./build-organization.mjs";

const PRODUCTION_ORIGIN = "https://javavolcano-touroperator.com";

// Bali-origin PDPs have one fallback image; Surabaya-origin splits by
// whether the route ever touches Ijen — matches the two divergent
// FALLBACK_IMAGE constants in jvto-web's tours/from-bali/[slug]/page.tsx
// and tours/from-surabaya/[slug]/page.tsx as of 2026-08-20 (design spec
// Bagian 3: "struktur menyalin field yang sudah dipakai jvto-web sekarang").
const SURABAYA_BROMO_ONLY_SLUGS = new Set([
  "bromo-1d1n",
  "bromo-2d1n",
  "taman-safari-prigen-bromo-madakaripura-3d2n",
]);

function stripHtml(html) {
  if (!html) return "";
  return String(html).replace(/<[^>]*>?/gm, "");
}

function calculateEndTime(startTime, durationMinutes) {
  if (!startTime) return "17:00";
  try {
    const [hoursPart, minutesPart] = startTime.split(":");
    const date = new Date();
    date.setHours(parseInt(hoursPart, 10), parseInt(minutesPart, 10) + (durationMinutes ?? 0));
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } catch {
    return startTime;
  }
}

function getDestinationUrl(name) {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return `${PRODUCTION_ORIGIN}/destinations/${slug}`;
}

function absoluteImage(rawPath) {
  return rawPath.startsWith("http") ? rawPath : `${PRODUCTION_ORIGIN}${rawPath}`;
}

function fallbackImage(route, originCity) {
  if (originCity === "Surabaya") {
    const bareSlug = route.split("/").pop() ?? "";
    return SURABAYA_BROMO_ONLY_SLUGS.has(bareSlug)
      ? `${PRODUCTION_ORIGIN}/assets/img/hero/home.webp`
      : `${PRODUCTION_ORIGIN}/ops/ijen-geopark-briefing.png`;
  }
  return `${PRODUCTION_ORIGIN}/ops/ijen-geopark-briefing.png`;
}

function buildDayNode(dayItem, pageUrl) {
  const dayId = `${pageUrl}#day-${dayItem.day}`;
  const activities = dayItem.activities ?? [];
  const firstActivity = activities[0];
  const lastActivity = activities[activities.length - 1];
  const departureTime = firstActivity?.timeWindow || "08:00";
  const arrivalTime = lastActivity
    ? calculateEndTime(lastActivity.timeWindow || "18:00", lastActivity.durationMinutes ?? 0)
    : "18:00";

  return {
    "@id": dayId,
    "@type": "TouristTrip",
    name: `Day ${dayItem.day}: ${dayItem.title}`,
    description: dayItem.summary,
    departureTime,
    arrivalTime,
    itinerary: {
      "@type": "ItemList",
      itemListElement: activities.map((act, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "TouristAttraction",
          name: act.name,
          description: act.description,
          url: getDestinationUrl(act.location || act.name || ""),
        },
      })),
    },
    provider: { "@id": ORG_ID },
    partOfTrip: { "@id": `${pageUrl}#tour` },
  };
}

/**
 * Builds the TouristTrip (+ nested day TouristTrip nodes) + AggregateOffer
 * nodes for one tour-package PDP, from a parsed <slug>.product-contract.json.
 *
 * Field-for-field port of the inline builder in jvto-web's
 * tours/from-bali/[slug]/page.tsx:182-195,271-303 and the from-surabaya
 * equivalent — NOT a redesign. Two deliberate normalizations over the
 * original (see plan Global Constraints):
 *   1. AggregateOffer is always a separate top-level node with its own @id
 *      (from-bali's original shape, now also used for from-surabaya).
 *   2. WebPage/BreadcrumbList/Product/mainEntityOfPage/subjectOf/mentions
 *      (DefinedTerm augmentation) are out of scope — they stay locally
 *      built in jvto-web.
 *
 * Day nodes are referenced from `touristTripNode.subTrip` and
 * `touristTripNode.itinerary.itemListElement` as bare {"@id": ...} objects
 * (NOT nested full objects — see note at the `subTrip` field below) AND
 * returned standalone (as `dayNodes`) — the caller must push `dayNodes`
 * into the same top-level @graph as `touristTripNode`, otherwise those
 * bare {"@id": "...#day-N"} references dangle (validate-schema.mjs
 * checkDanglingReferences flags any internal #-reference that isn't a
 * top-level graph node).
 *
 * Returns null (no crash) when the product contract is missing the minimum
 * fields a TouristTrip needs.
 */
export function buildTouristTripOfferNodes(pkg, route) {
  if (!pkg?.name || !Array.isArray(pkg.itineraryDays) || pkg.itineraryDays.length === 0) {
    return null;
  }

  const pageUrl = `${PRODUCTION_ORIGIN}${route}`;
  const schemaImageUrl = pkg.imageUrl
    ? absoluteImage(pkg.imageUrl)
    : pkg.gallery?.[0]
      ? absoluteImage(pkg.gallery[0])
      : fallbackImage(route, pkg.originCity);

  const dynamicOffers = (pkg.offers?.tiers ?? []).map((tier) => ({
    "@type": "Offer",
    sku: tier.sku,
    price: tier.pricePerPerson,
    priceCurrency: "IDR",
    eligibleQuantity: {
      "@type": "QuantitativeValue",
      minValue: tier.paxMin,
      ...(tier.paxMax > 0 ? { maxValue: tier.paxMax } : {}),
    },
    availability: "https://schema.org/InStock",
    url: pageUrl,
  }));

  const dayNodes = pkg.itineraryDays.map((dayItem) => buildDayNode(dayItem, pageUrl));

  const touristTripNode = {
    "@id": `${pageUrl}#tour`,
    "@type": "TouristTrip",
    name: pkg.name,
    description: stripHtml(pkg.description),
    url: pageUrl,
    image: [schemaImageUrl],
    inLanguage: "en",
    duration: `P${pkg.itineraryDays.length}D`,
    touristType: pkg.marketing?.perfectFor?.length ? pkg.marketing.perfectFor : ["Adventure seekers"],
    tripOrigin: { "@type": "Place", name: pkg.originCity },
    mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
    itinerary: {
      "@type": "ItemList",
      itemListElement: dayNodes.map((day, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: { "@id": day["@id"] },
      })),
    },
    // {"@id"}-only references, not the full nested day-node objects — the day
    // nodes are already emitted as full standalone top-level @graph nodes
    // (see `dayNodes` below), which is what checkDanglingReferences resolves
    // against (validate-schema.mjs:127-153, same pattern `offers` uses).
    // Nesting the full objects here too (the original shape) meant every day
    // node serialized twice per page once jvto-web started spreading the
    // ekosistem @graph verbatim — confirmed +10-17KB of pure duplicate
    // markup per PDP in production.
    subTrip: dayNodes.map((day) => ({ "@id": day["@id"] })),
    provider: { "@id": ORG_ID },
    offers: { "@id": `${pageUrl}#aggregateOffer` },
    identifier: [{ "@type": "PropertyValue", name: "Internal Package ID", value: pkg.packageId }],
  };

  const aggregateOfferNode = {
    "@id": `${pageUrl}#aggregateOffer`,
    "@type": "AggregateOffer",
    priceCurrency: "IDR",
    lowPrice: pkg.offers?.aggregateOffer?.lowPrice,
    highPrice: pkg.offers?.aggregateOffer?.highPrice,
    offerCount: pkg.offers?.tiers?.length ?? 0,
    availability: "https://schema.org/InStock",
    url: pageUrl,
    offers: dynamicOffers,
  };

  return { touristTripNode, dayNodes, aggregateOfferNode };
}
