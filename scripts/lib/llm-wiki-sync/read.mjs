import { readFile, access } from "node:fs/promises";
import path from "node:path";

// Bundle-relative path of every file this sync is allowed to touch. Mirrors
// sync_contract.required_files in the upstream manifest. The five unmanaged
// JSON files that sit in the same directory are absent by design — see
// UNMANAGED_FILES in gate.mjs.
const BUNDLE_FILES = [
  "_manifest.json",
  "claims.json",
  "faq.json",
  "aeo-snippets.json",
  "schema/organization.json",
  "schema/faq-page.json",
  "schema/tourist-trip.json",
];

const BUNDLE_SUBPATH = path.join("output", "website", "trust-bundle");

/**
 * Where the upstream checkout lives. LLM_WIKI_PATH matches the convention
 * jvto-web's sync-trust-bundle.mjs already uses; the sibling fallback is what
 * the GitHub workflow produces when it checks llm-wiki out at `../llm-wiki`.
 */
export function resolveLlmWikiRoot(explicit) {
  if (explicit) return explicit;
  if (process.env.LLM_WIKI_PATH) return process.env.LLM_WIKI_PATH;
  return path.join(process.cwd(), "..", "llm-wiki");
}

function bundleDir(llmWikiRoot) {
  return path.join(resolveLlmWikiRoot(llmWikiRoot), BUNDLE_SUBPATH);
}

export async function readManifest(llmWikiRoot) {
  const file = path.join(bundleDir(llmWikiRoot), "_manifest.json");
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Which of the contract's required files actually exist. The gate turns a
 * missing entry into a refusal; discovering it here keeps gate.mjs pure.
 */
export async function listPresentFiles(llmWikiRoot) {
  const dir = bundleDir(llmWikiRoot);
  const present = [];
  for (const rel of BUNDLE_FILES) {
    try {
      await access(path.join(dir, rel));
      present.push(rel);
    } catch {
      // absent — the gate reports it
    }
  }
  return present;
}

/**
 * Read the managed bundle. Every file is mandatory by the time this runs: the
 * gate has already refused a bundle with anything missing, so a read failure
 * here is a real error and must not be swallowed into a null.
 */
export async function readBundle(llmWikiRoot) {
  const dir = bundleDir(llmWikiRoot);
  const files = {};
  for (const rel of BUNDLE_FILES) {
    files[rel] = await readFile(path.join(dir, rel), "utf8");
  }
  return files;
}
