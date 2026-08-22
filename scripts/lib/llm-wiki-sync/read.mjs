import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Read the manifest.json from the trust-bundle output directory.
 */
export async function readManifest(llmWikiRoot) {
  const manifestPath = path.join(llmWikiRoot, "output/website/trust-bundle/_manifest.json");
  const content = await readFile(manifestPath, "utf8");
  return JSON.parse(content);
}

/**
 * Read the entire trust-bundle from llm-wiki output.
 * Returns an object containing all bundle files.
 */
export async function readBundle(llmWikiRoot) {
  const bundleDir = path.join(llmWikiRoot, "output/website/trust-bundle");

  const files = {
    manifest: null,
    claims: null,
    people: null,
    policies: null,
    destinations: null,
    products: null,
    operational: null,
    aeoSnippets: null,
    faq: null,
  };

  // Read all the key bundle files
  const fileMap = {
    manifest: "_manifest.json",
    claims: "claims.json",
    people: "people.json",
    policies: "policies.json",
    destinations: "destinations.json",
    products: "products.json",
    operational: "operational.json",
    aeoSnippets: "aeo-snippets.json",
    faq: "faq.json",
  };

  for (const [key, filename] of Object.entries(fileMap)) {
    const filePath = path.join(bundleDir, filename);
    try {
      const content = await readFile(filePath, "utf8");
      files[key] = JSON.parse(content);
    } catch (err) {
      if (err.code === "ENOENT") {
        // File doesn't exist, which is OK for some optional files
        files[key] = null;
      } else {
        throw err;
      }
    }
  }

  return files;
}
