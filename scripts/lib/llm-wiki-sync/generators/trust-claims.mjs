export function generateTrustClaims({ claims }) {
  if (!claims) {
    return { claims: [], schemaVersion: "2024-08" };
  }

  return {
    claims: claims,
    schemaVersion: "2024-08",
    generatedFrom: "trust-bundle/v1.0",
  };
}
