import { readFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_PATH = "1-knowledge-and-evidence-core/organization-identity/organization.json";
export const ORG_ID = "https://javavolcano-touroperator.com/#organization";

function credentialToSchema(credential) {
  return {
    "@type": "EducationalOccupationalCredential",
    name: credential.name,
    ...(credential.credentialCategory ? { credentialCategory: credential.credentialCategory } : {}),
    ...(credential.dateIssued ? { dateIssued: credential.dateIssued } : {}),
    ...(credential.documentUrl ? { url: credential.documentUrl } : {}),
    ...(credential.recognizedBy
      ? {
          recognizedBy: {
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

function isRatingValid(rating) {
  return Boolean(rating) && Number(rating.reviewCount) >= 1 && Number(rating.ratingValue) > 0;
}

function subjectToSchema(subject) {
  return {
    "@type": subject.type,
    ...(subject.headline ? { headline: subject.headline } : {}),
    ...(subject.name ? { name: subject.name } : {}),
    ...(subject.isbn ? { isbn: subject.isbn } : {}),
    ...(subject.datePublished ? { datePublished: subject.datePublished } : {}),
    ...(subject.url ? { url: subject.url } : {}),
    ...(subject.publisherName ? { publisher: { "@type": "Organization", name: subject.publisherName } } : {}),
  };
}

export async function buildOrganizationNode(root) {
  const raw = await readFile(path.join(root, SOURCE_PATH), "utf8");
  const data = JSON.parse(raw);

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
    ...(data.sameAs?.length ? { sameAs: data.sameAs } : {}),
    ...(data.award?.length ? { award: data.award } : {}),
    ...(data.memberOf?.length
      ? {
          memberOf: data.memberOf.map((member) => ({
            "@type": "Organization",
            name: member.name,
            ...(member.description ? { description: member.description } : {}),
            ...(member.sameAs ? { sameAs: member.sameAs } : {}),
          })),
        }
      : {}),
    ...(data.subjectOf?.length ? { subjectOf: data.subjectOf.map(subjectToSchema) } : {}),
    ...(data.hasCredential?.length ? { hasCredential: data.hasCredential.map(credentialToSchema) } : {}),
    ...(isRatingValid(data.aggregateRating)
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: data.aggregateRating.ratingValue,
            reviewCount: data.aggregateRating.reviewCount,
            bestRating: data.aggregateRating.bestRating,
            worstRating: data.aggregateRating.worstRating,
          },
        }
      : {}),
  };

  return node;
}
