export function generateFaq({ faq }) {
  if (!faq) {
    return { faqs: [], schemaVersion: "2024-08" };
  }

  return {
    faqs: faq,
    schemaVersion: "2024-08",
    generatedFrom: "trust-bundle/v1.0",
  };
}
