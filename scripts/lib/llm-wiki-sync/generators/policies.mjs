export function generatePolicies({ policies }) {
  if (!policies) {
    return { policies: [], schemaVersion: "2024-08" };
  }

  return {
    policies: policies,
    schemaVersion: "2024-08",
    generatedFrom: "trust-bundle/v1.0",
  };
}
