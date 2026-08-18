import { emitEntity } from "./external-entities.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_PATH = "1-knowledge-and-evidence-core/credentials-and-public-evidence/police-authority.json";
export const POLICE_AUTHORITY_ID = "https://javavolcano-touroperator.com/#police-authority";

export async function buildPoliceAuthorityNode(root, registry, route) {
  const raw = await readFile(path.join(root, SOURCE_PATH), "utf8");
  const data = JSON.parse(raw);

  return {
    "@id": POLICE_AUTHORITY_ID,
    "@type": "GovernmentService",
    name: data.name,
    description: data.description,
    provider:
      emitEntity(registry, data.provider.name, route) ?? {
        "@type": "GovernmentOrganization",
        name: data.provider.name,
        ...(data.provider.url ? { url: data.provider.url } : {}),
      },
    ...(data.areaServed ? { areaServed: { "@type": "Place", name: data.areaServed } } : {}),
  };
}

export function policeAuthorityReference() {
  return { "@id": POLICE_AUTHORITY_ID };
}
