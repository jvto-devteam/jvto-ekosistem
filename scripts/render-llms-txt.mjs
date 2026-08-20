#!/usr/bin/env node
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FEED_PATH = "5-experience-engine/knowledge-feed/public-web-content.feed-output.json";
const ORGANIZATION_PATH = "1-knowledge-and-evidence-core/organization-identity/organization.json";
const CLAIMS_PATH = "1-knowledge-and-evidence-core/narrative-claims/narrative-claims.json";
const REVIEW_PLATFORMS_PATH = "1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json";
const CREDENTIALS_PATH = "1-knowledge-and-evidence-core/credentials-and-public-evidence/credentials.json";
const PEOPLE_PATH = "1-knowledge-and-evidence-core/people-and-crew/people.json";
const DESTINATION_GLOB_DIR = "1-knowledge-and-evidence-core/destination-knowledge";
const TOUR_PRODUCTS_DIR = "2-product-and-commercial-core/tour-products";
const OUTPUT_PATH = "public/llms.txt";
// v1.2.0 (2026-08-20): llms.txt was an index — seven links whose payload
// (Rijik's 100-150 kg, press publishers/dates, crew names, destination
// numbers) stayed behind the door for any crawler that doesn't fetch all 73
// pages. It now carries those facts inline. Every value below is read from an
// ekosistem source; nothing here is hand-written prose.
const COMPILER_VERSION = "1.2.0";
// Matches jvto-web's robots.ts, which allows every AI-training crawler
// (GPTBot, CCBot, ClaudeBot, Google-Extended, Bytespider, etc.) — ai-train=yes
// so the header doesn't contradict what the site actually permits. Owner
// decision 2026-08-18.
const CONTENT_SIGNAL = "search=yes,ai-train=yes,use=reference";

const PRIORITY_ROUTES = [
  "/why-jvto",
  "/verify-jvto",
  "/travel-guide/ijen-health-screening",
  "/travel-guide/rijik-monthly-closure",
  "/travel-guide/booking-information",
  "/travel-guide/police-escort-for-groups",
  "/policy",
];

function truncateWords(text, maxWords) {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? text : `${words.slice(0, maxWords).join(" ")}...`;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

function compactAddress(address = {}) {
  return [
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode,
    address.addressCountry,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatReviewProfile(profile) {
  const rating = typeof profile.rating === "number" ? `${profile.rating} / 5` : "rating not asserted";
  const count = typeof profile.reviewCount === "number" ? `${profile.reviewCount} reviews` : "review count not asserted";
  const verified = profile.verifiedAt ? `, verified ${profile.verifiedAt}` : "";
  return `- **${profile.platform}**: ${rating}, ${count}${verified}. ${profile.profileUrl}`;
}

/** Catalogue floor: lowest low_price across every product contract. */
async function readPriceFloor() {
  const files = (await readdir(path.join(ROOT, TOUR_PRODUCTS_DIR))).filter((f) =>
    f.endsWith(".product-contract.json")
  );
  const prices = [];
  for (const file of files) {
    const contract = await readJson(path.join(TOUR_PRODUCTS_DIR, file));
    const low = contract?.pricing?.low_price ?? contract?.low_price;
    if (typeof low === "number" && low > 0) prices.push(low);
  }
  return prices.length ? Math.min(...prices) : null;
}

async function readDestinationFacts() {
  const files = (await readdir(path.join(ROOT, DESTINATION_GLOB_DIR)))
    .filter((f) => f.endsWith(".content.json"))
    .sort();
  const out = [];
  for (const file of files) {
    const d = await readJson(path.join(DESTINATION_GLOB_DIR, file));
    const facts = d.tourist_attraction_facts ?? {};
    out.push({
      slug: d.slug ?? file.replace(".content.json", ""),
      name: facts.name ?? d.name,
      altitude: d.altitude,
      hubRegion: d.hub_region,
      props: facts.additional_props ?? [],
      cost: facts.estimated_cost ?? null,
    });
  }
  return out;
}

async function main() {
  const [feed, organization, narrativeClaims, reviewPlatforms, credentials, people, destinations, priceFloor] =
    await Promise.all([
      readJson(FEED_PATH),
      readJson(ORGANIZATION_PATH),
      readJson(CLAIMS_PATH),
      readJson(REVIEW_PLATFORMS_PATH),
      readJson(CREDENTIALS_PATH),
      readJson(PEOPLE_PATH),
      readDestinationFacts(),
      readPriceFloor(),
    ]);
  const records = feed.records ?? feed;
  const compiledAt = new Date().toISOString();

  const selected = PRIORITY_ROUTES
    .map((route) => records.find((record) => record.route === route || record.route.startsWith(route)))
    .filter(Boolean)
    .slice(0, 20);

  if (selected.length < PRIORITY_ROUTES.length) {
    const missing = PRIORITY_ROUTES.filter(
      (route) => !records.some((record) => record.route === route || record.route.startsWith(route))
    );
    console.log(`WARNING: ${missing.length} priority route(s) not found in feed: ${missing.join(", ")}`);
  }

  const lines = [
    `# ${organization.brandName} (${organization.shortName})`,
    "> Machine-readable entity dossier for LLM crawlers. Private volcano tours in East Java, Indonesia - Bromo, Ijen, and Tumpak Sewu.",
    "",
    `Auto-generated from JVTO Operating Ecosystem (compiler render-llms-txt v${COMPILER_VERSION}, compiled ${compiledAt.slice(0, 10)}).`,
    "Source: jvto-ekosistem SSOT (organization identity, narrative claims, public evidence, knowledge feed).",
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "Do not hand-edit public/llms.txt; edit the source files and run npm run render:llms.",
    "",
    "## Entity Identity",
    `- **Legal name**: ${organization.legalName}`,
    `- **Brand name**: ${organization.brandName}`,
    `- **Website**: ${organization.websiteUrl}`,
    `- **Slogan**: ${organization.slogan}`,
    `- **Office**: ${compactAddress(organization.address)}`,
    `- **Founded**: ${organization.foundingDate} brand/guesthouse era; TDUP formalized 2023-02-11.`,
    `- **Booking channel**: ${organization.bookingChannel}`,
    "",
    "## Identifiers and Credentials",
  ];

  for (const identifier of organization.identifiers ?? []) {
    const issued = identifier.dateIssued ? `, issued ${identifier.dateIssued}` : "";
    lines.push(`- **${identifier.type}**: ${identifier.value}${issued}`);
  }

  for (const credential of credentials.credentials ?? []) {
    const value = credential.value ? ` (${credential.value})` : "";
    const recognizedBy = credential.recognizedBy ? `; recognized by ${credential.recognizedBy}` : "";
    const document = credential.documentUrl ? `; document ${credential.documentUrl}` : "";
    const hash = credential.sha256 ? `; SHA-256 ${credential.sha256}` : "";
    lines.push(`- **${credential.name}**${value}: ${credential.category}${recognizedBy}${document}${hash}`);
  }

  lines.push("");
  lines.push(`## Public Review Aggregate (${reviewPlatforms.lastReviewed})`);
  // THE public aggregate is Google Maps only — never a blended cross-platform
  // average (owner decision 2026-08-15, recorded in organization.json's
  // _comment). Until 2026-08-20 this line claimed "X / 5 across Trustpilot,
  // Google Maps, and TripAdvisor", i.e. it asserted to machines exactly the
  // figure the owner decided not to assert. Per-platform figures still follow,
  // each labelled with its own verifiedAt.
  const aggregateProfile = (reviewPlatforms.profiles ?? []).find(
    (profile) => profile.platform === "Google Maps"
  );
  if (aggregateProfile) {
    lines.push(
      `- **Aggregate rating**: ${aggregateProfile.rating} / 5 from ${aggregateProfile.reviewCount} Google Maps reviews (verified ${aggregateProfile.verifiedAt}). This is the single public aggregate; the per-platform figures below are not blended into one average.`
    );
  }
  for (const profile of reviewPlatforms.profiles ?? []) {
    lines.push(formatReviewProfile(profile));
  }

  lines.push("");
  lines.push(`## Canonical Claims (${narrativeClaims.claims?.length ?? 0})`);
  for (const claim of narrativeClaims.claims ?? []) {
    lines.push(`- **${claim.id} - ${claim.pillar}**: ${organization.websiteUrl}${claim.primary_page}`);
  }

  lines.push("");
  lines.push("## Fact-Dense Homepage Answer");
  // Derived, not hand-written: the rating follows the Google-only aggregate
  // above and the price follows the catalogue floor. The previous hardcoded
  // version drifted on both (it quoted Trustpilot's rating as if it were the
  // aggregate, and "From IDR 1.55M" when a 1.0M package exists).
  const nib = (organization.identifiers ?? []).find((identifier) => identifier.type === "NIB");
  const factLine = [
    "Private volcano tours from Surabaya & Bali. Tourist Police-led. No shared groups.",
    aggregateProfile
      ? `${aggregateProfile.rating}/5 from ${aggregateProfile.reviewCount} Google reviews.`
      : null,
    nib ? `NIB ${nib.value}.` : null,
    priceFloor ? `From IDR ${(priceFloor / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M/pax.` : null,
  ]
    .filter(Boolean)
    .join(" ");
  lines.push(`- ${factLine}`);

  lines.push("");
  lines.push("## Third-Party Recognition");
  lines.push(
    "Independent references to JVTO or its founder. None operator-produced; each has a page-level evidence record."
  );
  for (const award of organization.award ?? []) {
    lines.push(`- ${award}`);
  }
  for (const subject of organization.subjectOf ?? []) {
    const parts = [
      subject.headline ?? subject.name,
      subject.publisherName,
      subject.datePublished,
      subject.isbn ? `ISBN ${subject.isbn}` : null,
    ]
      .filter(Boolean)
      .join(" — ");
    if (parts) lines.push(`- ${parts}${subject.url ? `. ${subject.url}` : ""}`);
  }

  lines.push("");
  lines.push("## Crew (named in guest reviews)");
  lines.push(
    "Guides and drivers are named individually because guests name them. Mention counts are alias-reconciled against the Google review corpus."
  );
  for (const member of people.crew?.roster ?? []) {
    const mentions = member.googleReviewMentions?.aliasAdjustedReviewCount;
    const specialties = (member.specialties ?? []).join(", ");
    const mentionText = typeof mentions === "number" ? `, named in ${mentions} Google reviews` : "";
    lines.push(
      `- **${member.name}** (${member.role}${mentionText})${specialties ? `: ${specialties}` : ""}`
    );
  }

  lines.push("");
  lines.push("## Destination Facts");
  for (const destination of destinations) {
    const bits = [
      destination.altitude != null ? `${destination.altitude} m` : null,
      destination.hubRegion,
      ...(destination.props ?? []).map((prop) =>
        `${prop.name} ${prop.value}${prop.unit_text ? ` ${prop.unit_text}` : ""}`.trim()
      ),
      destination.cost
        ? `${destination.cost.name ?? "entrance"} ${destination.cost.currency} ${destination.cost.value}`
        : null,
    ].filter(Boolean);
    lines.push(`- **${destination.name}**: ${bits.join("; ")}.`);
  }

  lines.push("");
  lines.push("## Priority Pages");
  lines.push(
    "Each line states the page's key fact directly, so it can be quoted without fetching the page."
  );

  for (const record of selected) {
    // answerFirst is the page's own fact-dense one-liner (numbers, dates, rule
    // names). Fall back to the summary only where a page has not written one.
    const fact = record.answerFirst || truncateWords(record.summary, 20);
    lines.push(`- [${record.title}](https://javavolcano-touroperator.com${record.route}): ${fact}`);
  }
  lines.push("");
  lines.push("---");
  lines.push(`Compiled ${compiledAt} from ${records.length} knowledge-feed records. Feed generated ${feed.generated_at ?? "unknown"}.`);

  await writeFile(path.join(ROOT, OUTPUT_PATH), `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH} with ${selected.length} links`);
}

main();
