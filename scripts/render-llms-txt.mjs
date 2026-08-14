#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FEED_PATH = "5-experience-engine/knowledge-feed/public-web-content.feed-output.json";
const ORGANIZATION_PATH = "1-knowledge-and-evidence-core/organization-identity/organization.json";
const CLAIMS_PATH = "1-knowledge-and-evidence-core/narrative-claims/narrative-claims.json";
const REVIEW_PLATFORMS_PATH = "1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json";
const CREDENTIALS_PATH = "1-knowledge-and-evidence-core/credentials-and-public-evidence/credentials.json";
const OUTPUT_PATH = "public/llms.txt";
const COMPILER_VERSION = "1.1.0";
const CONTENT_SIGNAL = "search=yes,ai-train=no,use=reference";

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

async function main() {
  const [feed, organization, narrativeClaims, reviewPlatforms, credentials] = await Promise.all([
    readJson(FEED_PATH),
    readJson(ORGANIZATION_PATH),
    readJson(CLAIMS_PATH),
    readJson(REVIEW_PLATFORMS_PATH),
    readJson(CREDENTIALS_PATH),
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
  lines.push(`- **Aggregate rating**: ${reviewPlatforms.average_rating} / 5 across Trustpilot, Google Maps, and TripAdvisor source profiles.`);
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
  lines.push("- Private volcano tours from Surabaya & Bali. Tourist Police-led. No shared groups. 4.8 Trustpilot. NIB 1102230032918. From IDR 1.55M/pax.");
  lines.push("");
  lines.push("## Priority Pages");

  for (const record of selected) {
    lines.push(
      `- [${record.title}](https://javavolcano-touroperator.com${record.route}): ${truncateWords(record.summary, 20)}`
    );
  }
  lines.push("");
  lines.push("---");
  lines.push(`Compiled ${compiledAt} from ${records.length} knowledge-feed records. Feed generated ${feed.generated_at ?? "unknown"}.`);

  await writeFile(path.join(ROOT, OUTPUT_PATH), `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH} with ${selected.length} links`);
}

main();
