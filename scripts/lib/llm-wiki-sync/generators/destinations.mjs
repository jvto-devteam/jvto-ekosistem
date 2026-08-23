export function generateDestinations({ destinations }) {
  if (!destinations) {
    return { destinations: [], schemaVersion: "2024-08" };
  }

  return {
    destinations: destinations,
    schemaVersion: "2024-08",
    generatedFrom: "trust-bundle/v1.0",
  };
}
