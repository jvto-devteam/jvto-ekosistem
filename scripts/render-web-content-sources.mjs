import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { composeGraph } from "./lib/schema-contract.mjs";
import { buildOrganizationNode, ORG_ID } from "./lib/build-organization.mjs";
import { buildPersonNode } from "./lib/build-person.mjs";
import { buildPoliceAuthorityNode, policeAuthorityReference } from "./lib/build-police-authority.mjs";

const ROOT = process.cwd();
const GENERATED_AT = new Date().toISOString();
const SOURCE_DIRS = [
  "1-knowledge-and-evidence-core/travel-guide",
  "1-knowledge-and-evidence-core/why-jvto",
  "1-knowledge-and-evidence-core/policies",
  "1-knowledge-and-evidence-core/markets",
  "1-knowledge-and-evidence-core/blog",
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/verify-jvto-pages",
  "1-knowledge-and-evidence-core/destinations"
];
let peopleCache = null;

function routeToOutputBase(route) {
  return route.split("/").filter(Boolean).join("__") || "home";
}

async function loadPeople() {
  if (!peopleCache) {
    peopleCache = JSON.parse(
      await readFile(path.join(ROOT, "1-knowledge-and-evidence-core/people-and-crew/people.json"), "utf8")
    );
  }
  return peopleCache;
}

async function listSourceFiles(dir) {
  const absolute = path.join(ROOT, dir);
  const entries = await readdir(absolute, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".source.json"))
    .map((entry) => path.join(dir, entry.name));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

async function cleanGeneratedOutputs() {
  const targets = [
    "5-experience-engine/public-website/pages",
    "5-experience-engine/json-ld/pages"
  ];
  for (const target of targets) {
    await rm(path.join(ROOT, target), { recursive: true, force: true });
  }
}

function collectFaqItems(faq) {
  const directItems = Array.isArray(faq?.payload?.items) ? faq.payload.items : [];
  const sectionItems = Array.isArray(faq?.payload?.sections)
    ? faq.payload.sections.flatMap((section) =>
        Array.isArray(section?.blocks)
          ? section.blocks.flatMap((block) =>
              block?.role === "faq-list" && Array.isArray(block.items) ? block.items : []
            )
          : []
      )
    : [];

  return [...directItems, ...sectionItems]
    .filter((item) => item?.question && item?.answer)
    .map((item) => ({
      question: String(item.question),
      answer: String(item.answer),
    }));
}

function normalizeFaqForOutput(faq) {
  const items = collectFaqItems(faq);
  if (!faq || items.length === 0) {
    return null;
  }
  return {
    ...faq,
    payload: { items },
  };
}

function isRatingValid(rating) {
  return Boolean(rating) && Number(rating.reviewCount) >= 1 && Number(rating.ratingValue) > 0;
}

function buildWebsiteOutput(source) {
  return {
    schema_version: "jvto/output/public-website-page/v1",
    output_type: "public_website_page",
    generated_at: GENERATED_AT,
    route: source.route,
    domain: source.domain,
    slug: source.slug,
    status: source.meta?.status || "published",
    seo: source.seo || {
      title: source.meta?.browserTitle || source.meta?.title || "",
      description: source.meta?.description || "",
      canonicalRoute: source.route,
      schemaTypes: source.meta?.schemaTypes || ["WebPage"]
    },
    page: {
      title: source.meta?.title || "",
      summary: source.meta?.summary || "",
      ...(source.meta?.answerFirst ? { answerFirst: source.meta.answerFirst } : {}),
      owner: source.meta?.owner || "",
      lastReviewed: source.meta?.lastReviewed || "",
      ...(source.meta?.tags ? { tags: source.meta.tags } : {}),
      ...(source.meta?.estimatedReadMin ? { estimated_read_min: source.meta.estimatedReadMin } : {}),
      ...(source.meta?.bannerImage ? { banner_image: source.meta.bannerImage } : {}),
      content: source.content,
      faq: normalizeFaqForOutput(source.faq)
    },
    render_contract: {
      consumer: "jvto-web",
      route_level_payload: true,
      website_should_not_resolve_raw_sources: true
    },
    source_trace: source.source_trace
  };
}

async function buildSchemaOutput(source) {
  const schemaTypes = source.meta?.schemaTypes?.length ? source.meta.schemaTypes : ["WebPage"];
  const pageSchemaTypes = schemaTypes.filter((type) => type !== "Person" && type !== "FAQPage");
  const pageUrl = `https://javavolcano-touroperator.com${source.route}`;
  const nodes = [];

  const orgNode = await buildOrganizationNode(ROOT);
  nodes.push(orgNode);

  if (source.route === "/verify-jvto/police-safety") {
    const policeNode = await buildPoliceAuthorityNode(ROOT);
    nodes.push(policeNode);
    orgNode.subjectOf = [...(orgNode.subjectOf ?? []), policeAuthorityReference()];
  }

  nodes.push({
    "@id": `${pageUrl}#webpage`,
    "@type": pageSchemaTypes.length ? pageSchemaTypes : ["WebPage"],
    name: source.meta?.title || "",
    description: source.meta?.description || "",
    url: pageUrl,
    isPartOf: { "@id": ORG_ID },
  });

  const faq = normalizeFaqForOutput(source.faq);
  if (faq) {
    nodes.push({
      "@id": `${pageUrl}#faq`,
      "@type": "FAQPage",
      mainEntity: faq.payload.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  const teamMatch = source.route.match(/^\/why-jvto\/our-team\/([^/]+)$/);
  if (teamMatch) {
    const people = await loadPeople();
    const leadership = Array.isArray(people.leadership) ? people.leadership : [];
    const crewRoster = Array.isArray(people.crew?.roster) ? people.crew.roster : [];
    const publicPeople = leadership.concat(crewRoster).filter((person) => person.public !== false && person.rendered !== false);
    const record = publicPeople.find((person) => {
      const candidateSlug = person.id || person.slug || person.code;
      return candidateSlug === teamMatch[1];
    });
    const personNode = buildPersonNode(record, pageUrl);
    if (personNode) nodes.push(personNode);
  }

  return {
    schema_version: "jvto/output/json-ld-page/v1",
    output_type: "json_ld_page",
    generated_at: GENERATED_AT,
    route: source.route,
    domain: source.domain,
    slug: source.slug,
    json_ld: composeGraph(nodes),
    source_trace: source.source_trace
  };
}

function buildFeedRecord(source) {
  return {
    route: source.route,
    domain: source.domain,
    slug: source.slug,
    title: source.meta?.title || "",
    summary: source.meta?.summary || source.meta?.description || "",
    status: source.meta?.status || "published",
    owner: source.meta?.owner || "",
    lastReviewed: source.meta?.lastReviewed || "",
    outputTargets: source.output_targets || [],
    sourceFiles: source.source_trace?.source_files || []
  };
}

async function main() {
  const sourceFiles = (await Promise.all(SOURCE_DIRS.map(listSourceFiles))).flat().sort();
  const sources = [];

  await cleanGeneratedOutputs();
  await mkdir(path.join(ROOT, "5-experience-engine/public-website/pages"), { recursive: true });
  await mkdir(path.join(ROOT, "5-experience-engine/json-ld/pages"), { recursive: true });
  await mkdir(path.join(ROOT, "5-experience-engine/knowledge-feed"), { recursive: true });
  await mkdir(path.join(ROOT, "5-experience-engine/manifests"), { recursive: true });

  const routeIndex = [];
  const sourceOutputMap = [];
  const feedRecords = [];

  for (const sourceFile of sourceFiles) {
    const source = await readJson(sourceFile);
    sources.push(source);
    const base = routeToOutputBase(source.route);
    const websiteOutputPath = `5-experience-engine/public-website/pages/${base}.website-output.json`;
    const schemaOutputPath = `5-experience-engine/json-ld/pages/${base}.schema-output.json`;

    await writeFile(path.join(ROOT, websiteOutputPath), `${JSON.stringify(buildWebsiteOutput(source), null, 2)}\n`);
    await writeFile(path.join(ROOT, schemaOutputPath), `${JSON.stringify(await buildSchemaOutput(source), null, 2)}\n`);

    routeIndex.push({
      route: source.route,
      domain: source.domain,
      slug: source.slug,
      websiteOutput: websiteOutputPath,
      schemaOutput: schemaOutputPath
    });
    sourceOutputMap.push({
      source: sourceFile,
      outputs: [
        websiteOutputPath,
        schemaOutputPath,
        "5-experience-engine/knowledge-feed/public-web-content.feed-output.json"
      ]
    });
    feedRecords.push(buildFeedRecord(source));
  }

  const feed = {
    schema_version: "jvto/output/knowledge-feed/v1",
    output_type: "public_web_content_feed",
    generated_at: GENERATED_AT,
    record_count: feedRecords.length,
    records: feedRecords.sort((a, b) => a.route.localeCompare(b.route))
  };

  await writeFile(
    path.join(ROOT, "5-experience-engine/knowledge-feed/public-web-content.feed-output.json"),
    `${JSON.stringify(feed, null, 2)}\n`
  );
  await writeFile(
    path.join(ROOT, "5-experience-engine/manifests/route-output-index.json"),
    `${JSON.stringify({ generated_at: GENERATED_AT, routes: routeIndex.sort((a, b) => a.route.localeCompare(b.route)) }, null, 2)}\n`
  );
  await writeFile(
    path.join(ROOT, "5-experience-engine/manifests/source-output-map.json"),
    `${JSON.stringify({ generated_at: GENERATED_AT, mappings: sourceOutputMap.sort((a, b) => a.source.localeCompare(b.source)) }, null, 2)}\n`
  );

  console.log(JSON.stringify({
    generatedAt: GENERATED_AT,
    sourceCount: sources.length,
    websiteOutputCount: routeIndex.length,
    schemaOutputCount: routeIndex.length,
    feedRecordCount: feedRecords.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
