const ORGANIZATION_CLASS = new Set(["Organization", "TravelAgency", "LocalBusiness"]);

function typesOf(node) {
  const type = node["@type"];
  return Array.isArray(type) ? type : [type];
}

function singletonClassOf(node) {
  const types = typesOf(node);
  if (types.some((type) => ORGANIZATION_CLASS.has(type))) return "Organization";
  if (types.includes("FAQPage")) return "FAQPage";
  if (types.some((type) => typeof type === "string" && type.endsWith("Page") && type !== "FAQPage")) {
    return "WebPage-class";
  }
  return null;
}

export function composeGraph(nodes) {
  const byId = new Map();
  const singletonSeen = new Map();

  for (const node of nodes) {
    if (!node || !node["@id"]) {
      throw new Error(`schema-contract: node missing required @id - ${JSON.stringify(node)}`);
    }
    if (byId.has(node["@id"])) continue;

    const singletonClass = singletonClassOf(node);
    if (singletonClass) {
      const seenId = singletonSeen.get(singletonClass);
      if (seenId && seenId !== node["@id"]) {
        throw new Error(
          `schema-contract: more than one ${singletonClass} node in this route (${seenId} and ${node["@id"]})`
        );
      }
      singletonSeen.set(singletonClass, node["@id"]);
    }

    byId.set(node["@id"], node);
  }

  return {
    "@context": "https://schema.org",
    "@graph": [...byId.values()],
  };
}
