import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadExternalEntities, emitEntity } from "./external-entities.mjs";

const SOURCE_PATH = "1-knowledge-and-evidence-core/organization-identity/organization.json";
const REVIEW_PLATFORMS_PATH =
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json";
export const ORG_ID = "https://javavolcano-touroperator.com/#organization";

// The platform whose figure is the public aggregate — matches review-platforms.json's
// profiles[].platform. Same single-figure rule jvto-web's getPublicAggregateRating()
// enforces (owner decision 2026-08-15): Google Maps only, never a blended average.
const AGGREGATE_PLATFORM = "Google Maps";

/**
 * Pure — no fs. Given the parsed `profiles` array from review-platforms.json, returns
 * the AggregateRating node for the Google Maps entry, or null when that entry is
 * missing, malformed, or would assert a rating nobody can vouch for (reviewCount < 1 or
 * ratingValue <= 0 — the same guard `checkNoZeroRatings` in validate-schema.mjs enforces
 * on the output side, applied here so the violation is never emitted in the first
 * place). Never throws: a malformed review-platforms.json degrades to "no rating node"
 * for this route, not a failed render — same contract jvto-web's own
 * getPublicAggregateRating() follows when its sources can't answer.
 */
export function buildAggregateRating(profiles) {
  const googleProfile = Array.isArray(profiles)
    ? profiles.find((p) => p?.platform === AGGREGATE_PLATFORM)
    : null;
  if (!googleProfile) return null;

  const { rating, reviewCount } = googleProfile;
  if (typeof rating !== "number" || typeof reviewCount !== "number") return null;
  if (!(rating > 0) || !(reviewCount >= 1)) return null;

  return {
    "@type": "AggregateRating",
    ratingValue: rating,
    reviewCount,
    bestRating: 5,
  };
}

async function loadReviewProfiles(root) {
  try {
    const raw = await readFile(path.join(root, REVIEW_PLATFORMS_PATH), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.profiles) ? data.profiles : [];
  } catch {
    // Missing/unreachable/malformed file — mirrors the "ekosistem unreachable" contract
    // from the design spec's Error handling section: this route still renders, just
    // without the rating. Every other Organization field must still build normally.
    return [];
  }
}

function credentialToSchema(credential, registry, route) {
  return {
    "@type": "EducationalOccupationalCredential",
    name: credential.name,
    ...(credential.credentialCategory ? { credentialCategory: credential.credentialCategory } : {}),
    ...(credential.dateIssued ? { dateIssued: credential.dateIssued } : {}),
    ...(credential.documentUrl ? { url: credential.documentUrl } : {}),
    ...(credential.recognizedBy
      ? {
          recognizedBy:
            emitEntity(registry, credential.recognizedBy, route) ?? {
              "@type": "Organization",
              name: credential.recognizedBy,
            },
        }
      : {}),
    ...(credential.identifierValue
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: credential.name.split(" ")[0],
            value: credential.identifierValue,
          },
        }
      : {}),
    ...(credential.sha256
      ? {
          additionalProperty: {
            "@type": "PropertyValue",
            propertyID: "SHA-256",
            name: `${credential.name} document SHA-256`,
            value: credential.sha256,
          },
        }
      : {}),
  };
}

function subjectToSchema(subject, registry, route) {
  return {
    "@type": subject.type,
    ...(subject.headline ? { headline: subject.headline } : {}),
    ...(subject.name ? { name: subject.name } : {}),
    ...(subject.isbn ? { isbn: subject.isbn } : {}),
    ...(subject.datePublished ? { datePublished: subject.datePublished } : {}),
    ...(subject.url ? { url: subject.url } : {}),
    ...(subject.publisherName
      ? {
          publisher:
            emitEntity(registry, subject.publisherName, route) ?? {
              "@type": "Organization",
              name: subject.publisherName,
            },
        }
      : {}),
  };
}

/**
 * Minimal Organization reference for pages where the full node (aggregateRating,
 * sameAs, credentials, memberOf, ...) would be scope creep — currently the 217
 * review-detail pages, whose Product node needs `brand: {"@id": ORG_ID}` to resolve
 * but whose consuming code (jvto-web) discards the Organization node entirely, only
 * reading the Product. Still a genuine node, not a bare `{"@id": ...}` reference:
 * checkOrganizationIdentity requires an @id on every Organization-class node, and
 * carrying @type/name/url alongside it means it fully resolves on its own rather
 * than depending on checkDanglingReferences' bare-reference exemption. Only reads
 * organization.json — unlike buildOrganizationNode, it does not load the
 * external-entities registry or review-platforms.json, since none of the fields it
 * emits need them.
 */
export async function buildLeanOrganizationReference(root) {
  const raw = await readFile(path.join(root, SOURCE_PATH), "utf8");
  const data = JSON.parse(raw);
  return {
    "@id": ORG_ID,
    "@type": ["Organization", "TravelAgency", "LocalBusiness"],
    name: data.brandName,
    url: data.websiteUrl,
  };
}

export async function buildOrganizationNode(root, route) {
  const raw = await readFile(path.join(root, SOURCE_PATH), "utf8");
  const data = JSON.parse(raw);
  const registry = await loadExternalEntities(root);
  const aggregateRating = buildAggregateRating(await loadReviewProfiles(root));

  const node = {
    "@id": ORG_ID,
    "@type": ["Organization", "TravelAgency", "LocalBusiness"],
    name: data.brandName,
    legalName: data.legalName,
    alternateName: data.shortName,
    url: data.websiteUrl,
    telephone: data.telephone,
    email: data.email,
    foundingDate: data.foundingDate,
    slogan: data.slogan,
    ...(data.logo ? { logo: { "@type": "ImageObject", url: data.logo } } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: data.address?.streetAddress,
      addressLocality: data.address?.addressLocality,
      addressRegion: data.address?.addressRegion,
      postalCode: data.address?.postalCode,
      addressCountry: data.address?.addressCountry,
    },
    ...(data.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: data.geo.latitude,
            longitude: data.geo.longitude,
          },
        }
      : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(data.sameAs?.length ? { sameAs: data.sameAs } : {}),
    ...(data.award?.length ? { award: data.award } : {}),
    ...(data.memberOf?.length
      ? {
          memberOf: data.memberOf.map((member) => {
            const resolved = emitEntity(registry, member.name, route);
            if (resolved) {
              // Description stays on the definition, never on a bare reference.
              return resolved["@type"] && member.description
                ? { ...resolved, description: member.description }
                : resolved;
            }
            return {
              "@type": "Organization",
              name: member.name,
              ...(member.description ? { description: member.description } : {}),
              ...(member.sameAs ? { sameAs: member.sameAs } : {}),
            };
          }),
        }
      : {}),
    ...(data.subjectOf?.length ? { subjectOf: data.subjectOf.map((s) => subjectToSchema(s, registry, route)) } : {}),
    ...(data.hasCredential?.length ? { hasCredential: data.hasCredential.map((c) => credentialToSchema(c, registry, route)) } : {}),
  };

  return node;
}
