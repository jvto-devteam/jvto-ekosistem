export function generatePeople({ people }) {
  if (!people) {
    return { people: [], schemaVersion: "2024-08" };
  }

  return {
    people: people,
    schemaVersion: "2024-08",
    generatedFrom: "trust-bundle/v1.0",
  };
}
