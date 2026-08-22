/**
 * schema-validator.mjs
 * 
 * Reusable schema validation checks for JSON-LD @graph structures.
 * Used by jvto-ekosistem (ekosistem validation) and llm-wiki (ingestion validation).
 * 
 * Exports:
 * - schemaValidators: object of individual check functions
 *   - checkNoMissingIds(graph, route)
 *   - checkNoDuplicateSingletons(graph, route)
 *   - checkNoZeroRatings(graph, route)
 *   - checkOrganizationIdentity(graph, route)
 *   - checkDanglingReferences(graph, route, registryIds)
 * - ORGANIZATION_CLASSES: Set of schema.org org types that are singletons
 * - ORGANIZATION_ANY: Set of all org-like types
 */

/**
 * Extract @type as array, handling both string and array forms.
 */
function typesOf(node) {
  const type = node["@type"];
  return Array.isArray(type) ? type : [type];
}

/**
 * Determine singleton class of a node, or null if not a singleton.
 * Singletons: Organization-class (org/travel/business), FAQPage, WebPage-class.
 */
function singletonClassOf(node) {
  const types = typesOf(node);
  const ORGANIZATION_CLASS = new Set(["Organization", "TravelAgency", "LocalBusiness"]);
  
  if (types.some((type) => ORGANIZATION_CLASS.has(type))) return "Organization";
  if (types.includes("FAQPage")) return "FAQPage";
  if (types.some((type) => typeof type === "string" && type.endsWith("Page") && type !== "FAQPage")) {
    return "WebPage-class";
  }
  return null;
}

/**
 * Organization type sets for schema.org compliance.
 */
export const ORGANIZATION_CLASSES = new Set(["Organization", "TravelAgency", "LocalBusiness"]);
export const ORGANIZATION_ANY = new Set([
  "Organization",
  "TravelAgency",
  "LocalBusiness",
  "GovernmentOrganization",
  "NGO",
  "Corporation",
  "EducationalOrganization",
]);

/**
 * Check that all nodes have @id.
 * 
 * @param {object} graph - JSON-LD graph object with @graph array
 * @param {string} route - Route identifier for error messages
 * @returns {array} Array of violation strings
 */
export function checkNoMissingIds(graph, route) {
  return (graph["@graph"] ?? [])
    .filter((node) => !node["@id"])
    .map(() => `${route}: node missing @id`);
}

/**
 * Check that singleton classes appear at most once per route.
 * Singletons: Organization, FAQPage, WebPage-class.
 * 
 * @param {object} graph - JSON-LD graph
 * @param {string} route - Route identifier
 * @returns {array} Violations
 */
export function checkNoDuplicateSingletons(graph, route) {
  const seen = new Map();
  const violations = [];
  for (const node of graph["@graph"] ?? []) {
    const cls = singletonClassOf(node);
    if (!cls) continue;
    if (seen.has(cls) && seen.get(cls) !== node["@id"]) {
      violations.push(`${route}: more than one ${cls} node`);
    }
    seen.set(cls, node["@id"]);
  }
  return violations;
}

/**
 * Check that aggregateRating and nested reviewRating have valid values.
 * Valid: reviewCount >= 1, ratingValue > 0, both numeric.
 * 
 * @param {object} graph - JSON-LD graph
 * @param {string} route - Route identifier
 * @returns {array} Violations
 */
export function checkNoZeroRatings(graph, route) {
  const violations = [];
  for (const node of graph["@graph"] ?? []) {
    const rating = node.aggregateRating;
    if (rating && (Number(rating.reviewCount) < 1 || Number(rating.ratingValue) <= 0)) {
      violations.push(
        `${route}: aggregateRating with reviewCount=${rating.reviewCount} ratingValue=${rating.ratingValue}`
      );
    }

    const nestedReviews = Array.isArray(node.review) ? node.review : node.review ? [node.review] : [];
    for (const nestedReview of nestedReviews) {
      const reviewRating = nestedReview?.reviewRating;
      if (!reviewRating) continue;
      const numericValue = Number(reviewRating.ratingValue);
      if (Number.isNaN(numericValue) || numericValue <= 0) {
        violations.push(
          `${route}: review.reviewRating with ratingValue=${JSON.stringify(reviewRating.ratingValue)}`
        );
      }
    }
  }
  return violations;
}

/**
 * Check that every organization node (any type in ORGANIZATION_ANY) has an @id.
 * Prevents anonymous organizations that can't be linked across pages.
 * 
 * @param {object} graph - JSON-LD graph
 * @param {string} route - Route identifier
 * @returns {array} Violations
 */
export function checkOrganizationIdentity(graph, route) {
  const violations = [];
  function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    const types = typesOf(value).filter(Boolean);
    if (types.some((type) => ORGANIZATION_ANY.has(type)) && !value["@id"]) {
      violations.push(`${route}: organization node without @id (${value.name ?? "unnamed"})`);
    }
    Object.values(value).forEach(walk);
  }
  walk(graph["@graph"] ?? []);
  return violations;
}

/**
 * Check for dangling @id references.
 * A reference is dangling if:
 *   - It's an internal URL (https://javavolcano-touroperator.com/#...)
 *   - It points to an @id not in the graph
 *   - It's not in the registryIds set (cross-route references)
 *   - It's not an exempted external reference (e.g., PDP #webpage)
 * 
 * @param {object} graph - JSON-LD graph
 * @param {string} route - Route identifier
 * @param {Set} registryIds - Set of known cross-route @ids
 * @param {object} options - Configuration:
 *   - internalIdPrefix: internal domain prefix (default: "https://javavolcano-touroperator.com/")
 *   - exemptedRefs: Set of @ids to never flag as dangling
 * @returns {array} Violations
 */
export function checkDanglingReferences(graph, route, registryIds = new Set(), options = {}) {
  const {
    internalIdPrefix = "https://javavolcano-touroperator.com/",
    exemptedRefs = new Set(),
  } = options;

  const nodes = graph["@graph"] ?? [];
  const knownIds = new Set(nodes.map((node) => node["@id"]));
  const violations = [];

  function isInternalGraphReference(id) {
    return typeof id === "string" && id.startsWith(internalIdPrefix) && id.includes("#");
  }

  function walk(value) {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;

    const keys = Object.keys(value);
    if (
      keys.length === 1 &&
      keys[0] === "@id" &&
      isInternalGraphReference(value["@id"]) &&
      !knownIds.has(value["@id"]) &&
      !registryIds.has(value["@id"]) &&
      !exemptedRefs.has(value["@id"])
    ) {
      violations.push(`${route}: dangling @id reference ${value["@id"]}`);
      return;
    }
    Object.values(value).forEach(walk);
  }

  nodes.forEach(walk);
  return violations;
}

/**
 * Convenience object grouping all validators for easy composition.
 */
export const schemaValidators = {
  checkNoMissingIds,
  checkNoDuplicateSingletons,
  checkNoZeroRatings,
  checkOrganizationIdentity,
  checkDanglingReferences,
};
