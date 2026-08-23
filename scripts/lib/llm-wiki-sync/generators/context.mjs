import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadLlmWikiContext({ archiveRoot = process.cwd() } = {}) {
  const bundlePath = path.join(archiveRoot, "archive/llm-wiki-snapshot/bundle.json");
  const manifestPath = path.join(archiveRoot, "archive/llm-wiki-snapshot/manifest.json");

  const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  return {
    bundle,
    manifest,
    claims: bundle.claims || null,
    people: bundle.people || null,
    policies: bundle.policies || null,
    destinations: bundle.destinations || null,
    products: bundle.products || null,
    operational: bundle.operational || null,
    aeoSnippets: bundle.aeoSnippets || null,
    faq: bundle.faq || null,
  };
}
