export function generateOperational({ operational }) {
  if (!operational) {
    return { operational: {}, schemaVersion: "2024-08" };
  }

  return {
    operational: operational,
    schemaVersion: "2024-08",
    generatedFrom: "trust-bundle/v1.0",
  };
}
