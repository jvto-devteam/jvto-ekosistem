import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadGeneratorContext } from "./lib/booking-sync/generators/context.mjs";
import { generateBookingRecords } from "./lib/booking-sync/generators/booking-records.mjs";
import { generateGuestPortalRecords } from "./lib/booking-sync/generators/guest-portal-records.mjs";
import { generateCustomerPortalBookingDetails } from "./lib/booking-sync/generators/customer-portal-booking-details.mjs";
import { generateCustomerPortalLogistics } from "./lib/booking-sync/generators/customer-portal-logistics.mjs";
import { generateCustomerPortalItineraryRecords } from "./lib/booking-sync/generators/customer-portal-itinerary-records.mjs";
import { generateCustomerPortalAccommodationRecords } from "./lib/booking-sync/generators/customer-portal-accommodation-records.mjs";
import { generateCustomerPortalCrewRecords } from "./lib/booking-sync/generators/customer-portal-crew-records.mjs";
import { generateCustomerPortalVehicleRecords } from "./lib/booking-sync/generators/customer-portal-vehicle-records.mjs";
import { generateCustomerPortalDetailRecords } from "./lib/booking-sync/generators/customer-portal-detail-records.mjs";
import { generateCustomerPortalFaqPackingFeed } from "./lib/booking-sync/generators/customer-portal-faq-packing-feed.mjs";

export const GENERATORS = [
  { outputPath: "3-booking-and-journey-core/booking/booking-records.json", generate: generateBookingRecords },
  { outputPath: "5-experience-engine/guest-portal/guest-portal-records.json", generate: generateGuestPortalRecords },
  { outputPath: "3-booking-and-journey-core/booking/customer-portal-booking-details.json", generate: generateCustomerPortalBookingDetails },
  { outputPath: "3-booking-and-journey-core/pickup-and-dropoff/customer-portal-logistics.json", generate: generateCustomerPortalLogistics },
  { outputPath: "2-product-and-commercial-core/routes-and-itineraries/customer-portal-itinerary-records.json", generate: generateCustomerPortalItineraryRecords },
  { outputPath: "4-operations-core/hotel-and-partner-confirmation/customer-portal-accommodation-records.json", generate: generateCustomerPortalAccommodationRecords },
  { outputPath: "4-operations-core/crew-assignment/customer-portal-crew-records.json", generate: generateCustomerPortalCrewRecords },
  { outputPath: "4-operations-core/vehicle-assignment/customer-portal-vehicle-records.json", generate: generateCustomerPortalVehicleRecords },
  { outputPath: "5-experience-engine/guest-portal/customer-portal-detail-records.json", generate: generateCustomerPortalDetailRecords },
  { outputPath: "5-experience-engine/knowledge-feed/customer-portal-faq-packing-feed.json", generate: generateCustomerPortalFaqPackingFeed },
];

export async function runGenerators({ archiveRoot = process.cwd() } = {}) {
  const context = await loadGeneratorContext({ archiveRoot });
  const written = [];
  for (const { outputPath, generate } of GENERATORS) {
    const content = generate(context);
    const fullPath = path.join(archiveRoot, outputPath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, JSON.stringify(content, null, 2) + "\n");
    written.push(outputPath);
  }
  return { written };
}

const isMainModule = path.resolve(process.argv[1] ?? "") === path.resolve(new URL(import.meta.url).pathname);
if (isMainModule) {
  const result = await runGenerators({});
  console.log(JSON.stringify(result, null, 2));
}
