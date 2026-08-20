import assert from "node:assert/strict";
import { buildTouristTripOfferNodes } from "../lib/build-tourist-trip.mjs";

const FULL_PKG = {
  name: "3 Day Bromo & Ijen Volcano Discovery from Bali",
  packageId: "package-BALI-3D2N-001",
  description: "<p>Cross-island volcano route.</p>",
  originCity: "Bali",
  imageUrl: "/uploads/3-day-bromo-ijen-volcano-discovery-from-bali_1.webp",
  gallery: ["/uploads/3-day-bromo-ijen-volcano-discovery-from-bali_0.webp"],
  marketing: { perfectFor: ["Adventure seekers", "Photography enthusiasts"] },
  offers: {
    aggregateOffer: { lowPrice: 2850000, highPrice: 7500000 },
    tiers: [
      { sku: "package-BALI-3D2N-001-1", paxMin: 11, paxMax: 0, pricePerPerson: 2850000 },
      { sku: "package-BALI-3D2N-001-6", paxMin: 2, paxMax: 2, pricePerPerson: 4050000 },
    ],
  },
  itineraryDays: [
    {
      day: 1,
      title: "Bali to the Bromo Side via East Java Crossing",
      summary: "Cross-island positioning day.",
      activities: [
        { type: "TravelAction", name: "Bali Morning Pick-up to Gilimanuk", description: "Morning pick up.", timeWindow: "08:00", durationMinutes: 240 },
        { type: "CheckInAction", name: "Bromo Hotel Check-in", description: "Check in and rest.", location: "Bromo Hotel", timeWindow: "19:00", durationMinutes: 10 },
      ],
    },
    {
      day: 2,
      title: "Ijen Climb and Return to Bali",
      summary: "Ijen segment then return.",
      activities: [
        { type: "TouristAttractionVisit", name: "Ijen sunrise hike", description: "Hike to the viewpoint.", location: "Ijen Area", timeWindow: "02:00", durationMinutes: 360 },
      ],
    },
  ],
};

const ROUTE = "/tours/from-bali/bromo-ijen-3d2n";
const PAGE_URL = "https://javavolcano-touroperator.com/tours/from-bali/bromo-ijen-3d2n";

{
  const result = buildTouristTripOfferNodes(FULL_PKG, ROUTE);
  assert.ok(result, "full data must build successfully");
  const { touristTripNode, dayNodes, aggregateOfferNode } = result;

  // TouristTrip required fields
  assert.equal(touristTripNode["@id"], `${PAGE_URL}#tour`);
  assert.equal(touristTripNode["@type"], "TouristTrip");
  assert.equal(touristTripNode.name, FULL_PKG.name);
  assert.equal(touristTripNode.url, PAGE_URL);
  assert.equal(touristTripNode.description, "Cross-island volcano route.", "description must be HTML-stripped");
  assert.deepEqual(touristTripNode.image, [`https://javavolcano-touroperator.com${FULL_PKG.imageUrl}`]);
  assert.equal(touristTripNode.duration, "P2D");
  assert.deepEqual(touristTripNode.touristType, FULL_PKG.marketing.perfectFor);
  assert.deepEqual(touristTripNode.tripOrigin, { "@type": "Place", name: "Bali" });
  assert.deepEqual(touristTripNode.provider, { "@id": "https://javavolcano-touroperator.com/#organization" });
  assert.deepEqual(touristTripNode.offers, { "@id": `${PAGE_URL}#aggregateOffer` });
  assert.deepEqual(touristTripNode.identifier, [
    { "@type": "PropertyValue", name: "Internal Package ID", value: "package-BALI-3D2N-001" },
  ]);

  // subTrip embed matches dayNodes exactly (same objects, same @ids)
  assert.equal(touristTripNode.subTrip.length, 2);
  assert.equal(touristTripNode.subTrip[0]["@id"], `${PAGE_URL}#day-1`);
  assert.deepEqual(touristTripNode.itinerary.itemListElement, [
    { "@type": "ListItem", position: 1, item: { "@id": `${PAGE_URL}#day-1` } },
    { "@type": "ListItem", position: 2, item: { "@id": `${PAGE_URL}#day-2` } },
  ]);

  // day nodes are proper standalone TouristTrip nodes (needed so the bare
  // {"@id"} references above resolve inside ekosistem's own graph — see
  // Global Constraints / validate-schema.mjs's checkDanglingReferences)
  assert.equal(dayNodes.length, 2);
  assert.equal(dayNodes[0]["@type"], "TouristTrip");
  assert.equal(dayNodes[0]["@id"], `${PAGE_URL}#day-1`);
  assert.equal(dayNodes[0].name, "Day 1: Bali to the Bromo Side via East Java Crossing");
  assert.equal(dayNodes[0].departureTime, "08:00");
  assert.equal(dayNodes[0].arrivalTime, "19:10", "arrival = last activity's timeWindow + durationMinutes");
  assert.deepEqual(dayNodes[0].provider, { "@id": "https://javavolcano-touroperator.com/#organization" });
  assert.deepEqual(dayNodes[0].partOfTrip, { "@id": `${PAGE_URL}#tour` });
  assert.equal(dayNodes[0].itinerary.itemListElement.length, 2);
  assert.equal(dayNodes[0].itinerary.itemListElement[0].item["@type"], "TouristAttraction");

  // AggregateOffer required fields
  assert.equal(aggregateOfferNode["@id"], `${PAGE_URL}#aggregateOffer`);
  assert.equal(aggregateOfferNode["@type"], "AggregateOffer");
  assert.equal(aggregateOfferNode.priceCurrency, "IDR");
  assert.equal(aggregateOfferNode.lowPrice, 2850000);
  assert.equal(aggregateOfferNode.highPrice, 7500000);
  assert.equal(aggregateOfferNode.offerCount, 2);
  assert.equal(aggregateOfferNode.availability, "https://schema.org/InStock");
  assert.equal(aggregateOfferNode.url, PAGE_URL);
  assert.equal(aggregateOfferNode.offers.length, 2);
  assert.deepEqual(aggregateOfferNode.offers[0], {
    "@type": "Offer",
    sku: "package-BALI-3D2N-001-1",
    price: 2850000,
    priceCurrency: "IDR",
    eligibleQuantity: { "@type": "QuantitativeValue", minValue: 11 },
    availability: "https://schema.org/InStock",
    url: PAGE_URL,
  });
  assert.deepEqual(aggregateOfferNode.offers[1].eligibleQuantity, { "@type": "QuantitativeValue", minValue: 2, maxValue: 2 });
}

{
  // Missing itineraryDays → graceful skip, not a crash.
  const result = buildTouristTripOfferNodes({ name: "x", offers: { tiers: [] } }, ROUTE);
  assert.equal(result, null);
}

{
  // Missing name → graceful skip.
  const result = buildTouristTripOfferNodes({ itineraryDays: [{ day: 1, activities: [] }] }, ROUTE);
  assert.equal(result, null);
}

{
  // Surabaya-origin, Ijen-relevant slug → Ijen geopark fallback image when no imageUrl/gallery.
  const pkg = { ...FULL_PKG, name: "Ijen route", imageUrl: undefined, gallery: [], originCity: "Surabaya" };
  const result = buildTouristTripOfferNodes(pkg, "/tours/from-surabaya/ijen-2d1n");
  assert.deepEqual(result.touristTripNode.image, ["https://javavolcano-touroperator.com/ops/ijen-geopark-briefing.png"]);
}

{
  // Surabaya-origin, Bromo-only slug → hero fallback image when no imageUrl/gallery.
  const pkg = { ...FULL_PKG, name: "Bromo route", imageUrl: undefined, gallery: [], originCity: "Surabaya" };
  const result = buildTouristTripOfferNodes(pkg, "/tours/from-surabaya/bromo-1d1n");
  assert.deepEqual(result.touristTripNode.image, ["https://javavolcano-touroperator.com/assets/img/hero/home.webp"]);
}

console.log("build-tourist-trip.test.mjs: all assertions passed");
