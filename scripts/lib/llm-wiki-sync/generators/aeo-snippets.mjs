export function generateAeoSnippets({ aeoSnippets }) {
  if (!aeoSnippets) {
    return { snippets: [], schemaVersion: "2024-08" };
  }

  return {
    snippets: aeoSnippets,
    schemaVersion: "2024-08",
    generatedFrom: "trust-bundle/v1.0",
  };
}
