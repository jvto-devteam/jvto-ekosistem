#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FEED_PATH = "5-experience-engine/knowledge-feed/public-web-content.feed-output.json";
const OUTPUT_PATH = "public/llms.txt";

const PRIORITY_ROUTES = [
  "/why-jvto",
  "/verify-jvto",
  "/travel-guide/ijen-health-screening",
  "/travel-guide/rijik-monthly-closure",
  "/travel-guide/booking-information",
  "/travel-guide/police-escort-for-groups",
  "/isic/student-package",
  "/policy",
];

function truncateWords(text, maxWords) {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? text : `${words.slice(0, maxWords).join(" ")}...`;
}

async function main() {
  const feed = JSON.parse(await readFile(path.join(ROOT, FEED_PATH), "utf8"));
  const records = feed.records ?? feed;

  const selected = PRIORITY_ROUTES
    .map((route) => records.find((record) => record.route === route || record.route.startsWith(route)))
    .filter(Boolean)
    .slice(0, 20);

  if (selected.length < PRIORITY_ROUTES.length) {
    const missing = PRIORITY_ROUTES.filter(
      (route) => !records.some((record) => record.route === route || record.route.startsWith(route))
    );
    console.log(`WARNING: ${missing.length} priority route(s) not found in feed: ${missing.join(", ")}`);
  }

  const lines = [
    "# Java Volcano Tour Operator (JVTO)",
    "> Private volcano tours in East Java, Indonesia - Bromo, Ijen, Tumpak Sewu.",
    "",
  ];
  for (const record of selected) {
    lines.push(
      `- [${record.title}](https://javavolcano-touroperator.com${record.route}): ${truncateWords(record.summary, 20)}`
    );
  }

  await writeFile(path.join(ROOT, OUTPUT_PATH), `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH} with ${selected.length} links`);
}

main();
