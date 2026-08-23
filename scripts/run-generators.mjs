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
import { loadLlmWikiContext } from "./lib/llm-wiki-sync/generators/context.mjs";
import { generateTrustClaims } from "./lib/llm-wiki-sync/generators/trust-claims.mjs";
import { generatePeople } from "./lib/llm-wiki-sync/generators/people.mjs";
import { generatePolicies } from "./lib/llm-wiki-sync/generators/policies.mjs";
import { generateDestinations } from "./lib/llm-wiki-sync/generators/destinations.mjs";
import { generateProducts } from "./lib/llm-wiki-sync/generators/products.mjs";
import { generateOperational } from "./lib/llm-wiki-sync/generators/operational.mjs";
import { generateAeoSnippets } from "./lib/llm-wiki-sync/generators/aeo-snippets.mjs";
import { generateFaq } from "./lib/llm-wiki-sync/generators/faq.mjs";

export const GENERATORS = [
  // Booking sync generators
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
  // LLM-wiki sync generators
  { outputPath: "1-knowledge-and-evidence-core/trust-claims/trust-claims.json", generate: generateTrustClaims, contextLoader: loadLlmWikiContext },
  { outputPath: "1-knowledge-and-evidence-core/people/people.json", generate: generatePeople, contextLoader: loadLlmWikiContext },
  { outputPath: "1-knowledge-and-evidence-core/policies/policies.json", generate: generatePolicies, contextLoader: loadLlmWikiContext },
  { outputPath: "1-knowledge-and-evidence-core/destinations/destinations.json", generate: generateDestinations, contextLoader: loadLlmWikiContext },
  { outputPath: "1-knowledge-and-evidence-core/products/products.json", generate: generateProducts, contextLoader: loadLlmWikiContext },
  { outputPath: "1-knowledge-and-evidence-core/operational/operational.json", generate: generateOperational, contextLoader: loadLlmWikiContext },
  { outputPath: "1-knowledge-and-evidence-core/aeo-snippets/aeo-snippets.json", generate: generateAeoSnippets, contextLoader: loadLlmWikiContext },
  { outputPath: "1-knowledge-and-evidence-core/faqs/faq.json", generate: generateFaq, contextLoader: loadLlmWikiContext },
];

export async function runGenerators({ archiveRoot = process.cwd() } = {}) {
  const bookingSyncContext = await loadGeneratorContext({ archiveRoot });
  const contexts = { default: bookingSyncContext };

  const written = [];
  for (const { outputPath, generate, contextLoader } of GENERATORS) {
    let context = contexts.default;

    // Load context for llm-wiki generators if needed
    if (contextLoader && !contexts.llmWiki) {
      try {
        contexts.llmWiki = await contextLoader({ archiveRoot });
      } catch (err) {
        console.warn(`Skipping llm-wiki generators: ${err.message}`);
        continue;
      }
    }

    if (contextLoader) {
      context = contexts.llmWiki;
    }

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
