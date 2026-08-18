import { emitEntity } from "./external-entities.mjs";

function normalizeImage(image) {
  if (!image) return [];
  if (Array.isArray(image)) {
    return image
      .filter((item) => item?.url || item?.src)
      .map((item) => ({
        "@type": "ImageObject",
        url: item.url || item.src,
        ...(item.caption || item.alt ? { caption: item.caption || item.alt } : {}),
      }));
  }
  if (image.url || image.src) {
    return [
      {
        "@type": "ImageObject",
        url: image.url || image.src,
        ...(image.caption || image.alt ? { caption: image.caption || image.alt } : {}),
      },
    ];
  }
  return [];
}

function credentialToSchema(credential, registry, route) {
  return {
    "@type": "EducationalOccupationalCredential",
    name: credential.name,
    ...(credential.credentialCategory ? { credentialCategory: credential.credentialCategory } : {}),
    ...(credential.dateIssued ? { dateIssued: credential.dateIssued } : {}),
    ...(credential.documentUrl || credential.verifyUrl ? { url: credential.documentUrl || credential.verifyUrl } : {}),
    ...(credential.recognizedBy
      ? {
          recognizedBy:
            emitEntity(registry, credential.recognizedBy, route) ?? {
              "@type": "Organization",
              name: credential.recognizedBy,
            },
        }
      : {}),
    ...(credential.sha256
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: "SHA-256",
            name: `${credential.name} document SHA-256`,
            value: credential.sha256,
          },
        }
      : {}),
  };
}

function ktaToCredential(record, registry, route) {
  if (!record?.kta?.id) return null;
  return {
    "@type": "EducationalOccupationalCredential",
    name: `HPWKI membership credential ${record.kta.id}`,
    credentialCategory: record.kta.credentialType || "HPWKI membership credential",
    recognizedBy:
      emitEntity(registry, record.kta.issuer || "HPWKI", route) ?? {
        "@type": "Organization",
        name: record.kta.issuer || "HPWKI",
      },
    identifier: {
      "@type": "PropertyValue",
      propertyID: "KTA",
      value: record.kta.id,
    },
  };
}

function subjectToSchema(subject) {
  return {
    "@type": subject.type,
    ...(subject.headline ? { headline: subject.headline } : {}),
    ...(subject.datePublished ? { datePublished: subject.datePublished } : {}),
    ...(subject.url ? { url: subject.url } : {}),
    ...(subject.publisherName ? { publisher: { "@type": "Organization", name: subject.publisherName } } : {}),
  };
}

export function buildPersonNode(record, pageUrl, registry, route) {
  if (!record) return null;

  const explicitCredentials = (record.hasCredential ?? []).map((c) => credentialToSchema(c, registry, route));
  const ktaCredential = ktaToCredential(record, registry, route);
  const credentials = ktaCredential ? explicitCredentials.concat(ktaCredential) : explicitCredentials;
  const images = normalizeImage(record.image);
  const aliases = record.alternateNames || record.aliases || [];
  const jobTitle = record.jobTitle || record.roles || record.role;

  return {
    "@id": `${pageUrl}#person`,
    "@type": "Person",
    name: record.name,
    ...(aliases.length ? { alternateName: aliases } : {}),
    ...(jobTitle ? { jobTitle } : {}),
    ...(images.length ? { image: images } : {}),
    ...(record.sameAs?.length ? { sameAs: record.sameAs } : {}),
    ...(record.knowsAbout?.length ? { knowsAbout: record.knowsAbout } : {}),
    ...(credentials.length ? { hasCredential: credentials } : {}),
    ...(record.subjectOf?.length ? { subjectOf: record.subjectOf.map(subjectToSchema) } : {}),
  };
}
