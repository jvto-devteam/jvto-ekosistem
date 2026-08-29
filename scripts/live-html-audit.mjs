#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const INVENTORY_PATH = path.join(ROOT, 'docs', 'website-audit', '2026-08-29', 'url_inventory.csv');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'website-audit', '2026-08-29', 'live_html_url_audit.csv');
const SUMMARY_PATH = path.join(ROOT, 'docs', 'website-audit', '2026-08-29', 'group_summary.csv');
const BASE_URL = 'https://javavolcano-touroperator.com';
const TIMEOUT_MS = 20000;

function readCsvRows(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing inventory file: ${filePath}`);
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row = {};
    header.forEach((key, index) => {
      row[key] = values[index] ?? '';
    });
    return row;
  });
}

function normalizeField(value) {
  return String(value ?? '').trim();
}

function getTagValue(html, regex) {
  const match = html.match(regex);
  if (!match) return '';
  const raw = match[1] ?? match[0] ?? '';
  return raw.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtmlEntities(stripTags(titleMatch ? titleMatch[1] : ''));
}

function extractMeta(html, nameOrProp) {
  const regex = new RegExp(
    `<meta[^>]+(?:name|property)=['\"]${nameOrProp}['\"][^>]*content=['\"]([^'\"]*)['\"][^>]*>|` +
      `<meta[^>]+content=['\"]([^'\"]*)['\"][^>]*(?:name|property)=['\"]${nameOrProp}['\"][^>]*>`,
    'i',
  );
  const match = html.match(regex);
  const value = match?.[1] || match?.[2] || '';
  return decodeHtmlEntities(value).trim();
}

function extractCanonical(html) {
  const match = html.match(/<link[^>]+rel=['\"]canonical['\"][^>]*href=['\"]([^'\"]+)['\"][^>]*>/i);
  return match?.[1]?.trim() || '';
}

function countTag(html, tagName) {
  return (html.match(new RegExp(`<${tagName}\\b`, 'gi')) || []).length;
}

function extractH1(html) {
  const matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const text = matches.map((match) => decodeHtmlEntities(stripTags(match[1]))).filter(Boolean).join(' | ');
  return { count: matches.length, text };
}

function extractJsonLdTypes(html) {
  const matches = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)];
  const types = [...new Set(matches.map((match) => match[1]).filter(Boolean))];
  return types;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': 'JVTO-Audit-Agent/1.0',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      text: '',
      fetchError: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function toCsvRow(row) {
  return Object.entries(row)
    .map(([key, value]) => {
      const text = String(value ?? '').replace(/"/g, '""');
      return `"${text}"`;
    })
    .join(',');
}

function buildSummary(rows) {
  const summary = new Map();

  rows.forEach((row) => {
    const group = row.group || 'unknown';
    if (!summary.has(group)) {
      summary.set(group, {
        group,
        url_count: 0,
        ok_200: 0,
        non_200: 0,
        missing_title: 0,
        missing_meta_description: 0,
        missing_canonical: 0,
        h1_zero: 0,
        h1_multiple: 0,
        missing_og_image: 0,
        missing_twitter_image: 0,
        missing_json_ld: 0,
      });
    }

    const item = summary.get(group);
    item.url_count += 1;
    if (Number(row.http_status) === 200) item.ok_200 += 1;
    else item.non_200 += 1;
    if (!row.title) item.missing_title += 1;
    if (!row.meta_description) item.missing_meta_description += 1;
    if (!row.canonical) item.missing_canonical += 1;
    if (Number(row.h1_count) === 0) item.h1_zero += 1;
    if (Number(row.h1_count) > 1) item.h1_multiple += 1;
    if (!row.og_image) item.missing_og_image += 1;
    if (!row.twitter_image) item.missing_twitter_image += 1;
    if (Number(row.json_ld_script_count) === 0) item.missing_json_ld += 1;
  });

  return [...summary.values()];
}

async function main() {
  const inventory = readCsvRows(INVENTORY_PATH);
  const outputRows = [];

  for (const entry of inventory) {
    const rawUrl = normalizeField(entry.url);
    const url = rawUrl.startsWith('http') ? rawUrl : `${BASE_URL}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;

    const result = await fetchPage(url);
    const html = result.text || '';
    const title = extractTitle(html);
    const metaDescription = extractMeta(html, 'description');
    const canonical = extractCanonical(html);
    const h1 = extractH1(html);
    const ogTitle = extractMeta(html, 'og:title');
    const ogDescription = extractMeta(html, 'og:description');
    const ogImage = extractMeta(html, 'og:image');
    const twitterCard = extractMeta(html, 'twitter:card');
    const twitterImage = extractMeta(html, 'twitter:image');
    const jsonLdScriptCount = (html.match(/<script\s+[^>]*type=['\"]application\/ld\+json['\"][^>]*>/gi) || []).length;
    const jsonLdTypes = extractJsonLdTypes(html);

    outputRows.push({
      url: rawUrl,
      group: normalizeField(entry.group),
      template_file: '',
      http_status: String(result.status),
      final_url: result.finalUrl || url,
      title: title || '',
      meta_description: metaDescription || '',
      canonical: canonical || '',
      h1_count: String(h1.count),
      h1_text: h1.text || '',
      og_title: ogTitle || '',
      og_description: ogDescription || '',
      og_image: ogImage || '',
      twitter_card: twitterCard || '',
      twitter_image: twitterImage || '',
      json_ld_script_count: String(jsonLdScriptCount),
      json_ld_types: jsonLdTypes.join('; ') || '',
      fetch_error: result.fetchError || '',
    });
  }

  const outputHeader = [
    'url',
    'group',
    'template_file',
    'http_status',
    'final_url',
    'title',
    'meta_description',
    'canonical',
    'h1_count',
    'h1_text',
    'og_title',
    'og_description',
    'og_image',
    'twitter_card',
    'twitter_image',
    'json_ld_script_count',
    'json_ld_types',
    'fetch_error',
  ];

  const csvLines = [outputHeader.join(',')];
  outputRows.forEach((row) => {
    csvLines.push(toCsvRow(row));
  });
  fs.writeFileSync(OUTPUT_PATH, `${csvLines.join('\n')}\n`, 'utf8');

  const summaryRows = buildSummary(outputRows);
  const summaryHeader = [
    'group',
    'url_count',
    'ok_200',
    'non_200',
    'missing_title',
    'missing_meta_description',
    'missing_canonical',
    'h1_zero',
    'h1_multiple',
    'missing_og_image',
    'missing_twitter_image',
    'missing_json_ld',
  ];

  const summaryLines = [summaryHeader.join(',')];
  summaryRows.forEach((row) => {
    summaryLines.push(toCsvRow(row));
  });
  fs.writeFileSync(SUMMARY_PATH, `${summaryLines.join('\n')}\n`, 'utf8');

  console.log(`[audit:website-live] wrote ${outputRows.length} rows to ${OUTPUT_PATH}`);
  console.log(`[audit:website-live] wrote summary to ${SUMMARY_PATH}`);
}

main().catch((error) => {
  console.error('[audit:website-live] failed');
  console.error(error);
  process.exit(1);
});
