import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GENERATED_AT = new Date().toISOString();

const ROUTE_GROUPS = [
  {
    key: "travel-guide",
    outputDir: "1-knowledge-and-evidence-core/travel-guide",
    routes: [
      { route: "/travel-guide", source: "1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/index.md", faqKey: "travel-guide-index" },
      { route: "/travel-guide/best-time-to-visit", source: "1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/best-time-to-visit.json", faqKey: "travel-guide-best-time-to-visit" },
      { route: "/travel-guide/booking-information", source: "1-knowledge-and-evidence-core/stable-operational-guidance/travel-guide-pages/booking-information.md", faqKey: "travel-guide-booking-information" },
      { route: "/travel-guide/faq", source: "1-knowledge-and-evidence-core/faqs/travel-guide-faq-page.json", faqKey: "travel-guide-faq-page" },
      { route: "/travel-guide/ijen-health-screening", source: "1-knowledge-and-evidence-core/health-and-safety-rules/ijen-health-screening.md", faqKey: "travel-guide-ijen-health-screening" },
      { route: "/travel-guide/packing-and-fitness", source: "1-knowledge-and-evidence-core/health-and-safety-rules/packing-and-fitness.md", faqKey: "travel-guide-packing-and-fitness" },
      { route: "/travel-guide/police-escort-for-groups", source: "1-knowledge-and-evidence-core/health-and-safety-rules/police-escort-for-groups.json" },
      { route: "/travel-guide/rijik-monthly-closure", source: "1-knowledge-and-evidence-core/health-and-safety-rules/rijik-monthly-closure.json", faqKey: "travel-guide-rijik-monthly-closure" },
      { route: "/travel-guide/safety-on-tours", source: "1-knowledge-and-evidence-core/health-and-safety-rules/safety-on-tours.md", faqKey: "travel-guide-safety-on-tours" },
      { route: "/travel-guide/weather-and-closures", source: "1-knowledge-and-evidence-core/health-and-safety-rules/weather-and-closures.md", faqKey: "travel-guide-weather-and-closures" }
    ]
  },
  {
    key: "why-jvto",
    outputDir: "1-knowledge-and-evidence-core/why-jvto",
    routes: [
      { route: "/why-jvto", source: "1-knowledge-and-evidence-core/narrative-claims/why-jvto-pages/index.json", faqKey: "why-jvto-hub" },
      { route: "/why-jvto/community-standards", source: "1-knowledge-and-evidence-core/narrative-claims/why-jvto-pages/community-standards.json", faqKey: "why-jvto-community-standards" },
      { route: "/why-jvto/our-story", source: "1-knowledge-and-evidence-core/narrative-claims/why-jvto-pages/our-story.json", faqKey: "why-jvto-our-story" },
      { route: "/why-jvto/our-team", source: "1-knowledge-and-evidence-core/narrative-claims/why-jvto-pages/our-team.json", faqKey: "why-jvto-our-team" },
      { route: "/why-jvto/reviews", source: "1-knowledge-and-evidence-core/narrative-claims/why-jvto-pages/reviews.json", faqKey: "why-jvto-reviews" },
      { route: "/why-jvto/the-jvto-difference", source: "1-knowledge-and-evidence-core/narrative-claims/why-jvto-pages/the-jvto-difference.json", faqKey: "why-jvto-the-jvto-difference" }
    ]
  },
  {
    key: "policy",
    outputDir: "1-knowledge-and-evidence-core/policies",
    routes: [
      { route: "/policy", source: "1-knowledge-and-evidence-core/policies/index.md" },
      { route: "/policy/booking-payment-cancellation", source: "1-knowledge-and-evidence-core/policies/booking-payment-cancellation.json" },
      { route: "/policy/inclusions-exclusions", source: "1-knowledge-and-evidence-core/policies/inclusions-exclusions.md" },
      { route: "/policy/privacy", source: "1-knowledge-and-evidence-core/policies/privacy.md" }
    ]
  }
];

function routeSlug(route) {
  const parts = route.split("/").filter(Boolean);
  return parts.length <= 1 ? "index" : parts.at(-1);
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^['"].*['"]$/.test(trimmed)) return trimmed.slice(1, -1);
  return trimmed;
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---\n")) {
    return { frontmatter: {}, body: markdown };
  }

  const end = markdown.indexOf("\n---", 4);
  if (end === -1) return { frontmatter: {}, body: markdown };

  const raw = markdown.slice(4, end);
  const body = markdown.slice(end + 4).replace(/^\n/, "");
  const frontmatter = {};
  let currentArrayKey = null;

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const arrayMatch = line.match(/^([A-Za-z0-9_-]+):\s*$/);
    if (arrayMatch) {
      currentArrayKey = arrayMatch[1];
      frontmatter[currentArrayKey] = [];
      continue;
    }
    const itemMatch = line.match(/^\s*-\s+(.+)$/);
    if (itemMatch && currentArrayKey) {
      frontmatter[currentArrayKey].push(parseScalar(itemMatch[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      currentArrayKey = null;
      frontmatter[kv[1]] = parseScalar(kv[2]);
    }
  }

  return { frontmatter, body };
}

function normalizeMeta(page, fallback) {
  const meta = page.meta || page.frontmatter || {};
  return {
    route: meta.route || fallback.route,
    title: meta.title || page.title || fallback.title || titleFromRoute(fallback.route),
    browserTitle: meta.browserTitle || meta.title || page.title || titleFromRoute(fallback.route),
    description: meta.description || page.description || "",
    section: meta.section || fallback.section,
    status: meta.status || page.status || "published",
    owner: meta.owner || page.owner || "",
    lastReviewed: meta.lastReviewed || page.lastReviewed || "",
    schemaTypes: meta.schemaTypes || page.schemaTypes || ["WebPage"],
    faqKey: fallback.faqKey || meta.faqKey || page.faqKey || null,
    summary: meta.summary || page.summary || ""
  };
}

function titleFromRoute(route) {
  const slug = routeSlug(route);
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function readJsonIfExists(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function readPage(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  const raw = await readFile(absolute, "utf8");
  if (relativePath.endsWith(".json")) {
    return {
      format: "json",
      raw,
      payload: JSON.parse(raw)
    };
  }

  const parsed = parseFrontmatter(raw);
  return {
    format: "markdown",
    raw,
    frontmatter: parsed.frontmatter,
    body_md: parsed.body
  };
}

function getFaqFile(faqKey) {
  if (!faqKey) return null;
  return `1-knowledge-and-evidence-core/faqs/${faqKey}.json`;
}

function getOutputFilename(route) {
  return `${routeSlug(route)}.source.json`;
}

async function main() {
  const metadataIndex = await readJsonIfExists("5-experience-engine/seo-metadata/page-metadata-index.json");
  const metadataItems = Array.isArray(metadataIndex) ? metadataIndex : metadataIndex?.pages || metadataIndex?.routes || [];
  const metadataByRoute = new Map(metadataItems.map((item) => [item.route, item]));

  const written = [];

  for (const group of ROUTE_GROUPS) {
    await mkdir(path.join(ROOT, group.outputDir), { recursive: true });

    for (const item of group.routes) {
      const sourcePage = await readPage(item.source);
      const pagePayload = sourcePage.format === "json" ? sourcePage.payload : {
        frontmatter: sourcePage.frontmatter,
        body_md: sourcePage.body_md
      };
      const meta = normalizeMeta(pagePayload, {
        route: item.route,
        section: group.key,
        faqKey: item.faqKey,
        title: metadataByRoute.get(item.route)?.title
      });

      const faqFile = getFaqFile(meta.faqKey);
      const faqPayload = faqFile ? await readJsonIfExists(faqFile) : null;
      const source = {
        schema_version: "jvto/source/public-web-page/v1",
        source_type: "public_web_page_source",
        domain: group.key,
        slug: routeSlug(item.route),
        route: item.route,
        cms: {
          editable: true,
          primary_editor: "tina",
          edit_scope: "one source file per public page object"
        },
        meta,
        seo: {
          title: meta.browserTitle,
          description: meta.description,
          canonicalRoute: item.route,
          schemaTypes: meta.schemaTypes
        },
        content: {
          format: sourcePage.format,
          payload: pagePayload
        },
        faq: faqPayload ? {
          key: meta.faqKey,
          payload: faqPayload
        } : null,
        output_targets: [
          "public_website",
          "json_ld",
          "knowledge_feed"
        ],
        source_trace: {
          generated_at: GENERATED_AT,
          source_files: [
            item.source,
            ...(faqFile && faqPayload ? [faqFile] : []),
            "5-experience-engine/seo-metadata/page-metadata-index.json"
          ],
          migration_note: "Initial CMS-editable source consolidation. Original files are retained during transition."
        }
      };

      const outputPath = path.join(group.outputDir, getOutputFilename(item.route));
      await writeFile(path.join(ROOT, outputPath), `${JSON.stringify(source, null, 2)}\n`);
      written.push(outputPath);
    }
  }

  console.log(JSON.stringify({
    generatedAt: GENERATED_AT,
    writtenCount: written.length,
    written
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
