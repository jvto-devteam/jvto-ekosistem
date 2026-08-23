export function generateProducts({ products }) {
  if (!products) {
    return { products: [], schemaVersion: "2024-08" };
  }

  return {
    products: products,
    schemaVersion: "2024-08",
    generatedFrom: "trust-bundle/v1.0",
  };
}
