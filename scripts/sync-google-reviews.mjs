#!/usr/bin/env node
// Syncs individual Google Business Profile reviews AND the aggregate rating
// into ekosistem, fully replacing jvto-web's old /api/review/sync-google
// route + Prisma reviews/crew_reviews/review_stats tables for the Google
// platform (Phase 2, 2026-08-19; Phase 1 was the aggregate-only
// sync-google-rating.mjs, now superseded/removed by this script since one
// full-page fetch already returns both the aggregate and the review list).
//
// Trustpilot/TripAdvisor reviews are NOT touched — there was never
// automation for them either; they stay as the static rows migrated in the
// one-time historical export (see reviews.json's _comment).
//
// Numeric review `id`s are a public, permanent identity: jvto-web's
// /why-jvto/reviews/{id} route and JSON-LD `#review-{id}` @id both embed
// them. New Google reviews get the next integer after reviews.json's
// `nextId` — never renumbered, never reused.
//
// Crew mentions are matched using the SAME alias rules already curated in
// this repo (people-and-crew roster + google-review-crew-alias-reconciliation.json),
// not a fresh guess — richer than jvto-web's old naive `\bName\b` regex
// (handles spelling variants like Rendi/Rendy, Fredi/Fredy/Freddy/Freddie).
// A mention that matches no known crew or alias is left unmatched — it is
// NOT guessed at, consistent with the 7 names already recorded as
// unresolved in people.json's reviewCorrelation.unresolvedGoogleReviewCrewMentions.
//
// Requires env: GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN,
// GBP_ACCOUNT_ID, GBP_LOCATION_ID.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const REVIEWS_PATH = path.join(
  REPO_ROOT,
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/reviews.json",
);
const RATING_PATH = path.join(
  REPO_ROOT,
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json",
);
const PEOPLE_PATH = path.join(
  REPO_ROOT,
  "1-knowledge-and-evidence-core/people-and-crew/people.json",
);
const ALIAS_PATH = path.join(
  REPO_ROOT,
  "5-experience-engine/reviews/google-review-crew-alias-reconciliation.json",
);

const GBP_TOKEN_URL = "https://oauth2.googleapis.com/token";
const STAR_MAP = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function getAccessToken() {
  const res = await fetch(GBP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requiredEnv("GBP_CLIENT_ID"),
      client_secret: requiredEnv("GBP_CLIENT_SECRET"),
      refresh_token: requiredEnv("GBP_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function fetchAllReviews(token) {
  const accountId = requiredEnv("GBP_ACCOUNT_ID");
  const locationId = requiredEnv("GBP_LOCATION_ID");
  const base = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`;

  const all = [];
  let averageRating = null;
  let totalReviewCount = null;
  let pageToken;

  do {
    const url = pageToken ? `${base}?pageToken=${encodeURIComponent(pageToken)}` : base;
    let activeToken = token;
    let res = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(url, { headers: { Authorization: `Bearer ${activeToken}` } });
      if (res.status === 401 && attempt === 0) {
        activeToken = await getAccessToken();
        continue;
      }
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === 3) break;
      await sleep(500 * 2 ** attempt);
    }

    if (!res) throw new Error("GBP API error: empty response");
    if (!res.ok) throw new Error(`GBP API error: ${res.status} ${await res.text()}`);

    const data = await res.json();
    all.push(...(data.reviews ?? []));
    pageToken = data.nextPageToken ?? undefined;
    if (data.averageRating != null) averageRating = data.averageRating;
    if (data.totalReviewCount != null) totalReviewCount = data.totalReviewCount;
  } while (pageToken);

  return { reviews: all, averageRating, totalReviewCount };
}

function serializeMedia(gbpReview) {
  const items = (gbpReview.reviewMediaItems ?? [])
    .map((item, index) => {
      const type = item.mediaFormat === "VIDEO" ? "video" : "photo";
      const thumbnailUrl = item.thumbnailUrl?.trim() || null;
      const videoUrl = item.videoUrl?.trim() || null;
      if (!thumbnailUrl && !videoUrl) return null;
      return {
        id: `${gbpReview.name.split("/").pop() ?? "review"}-${index + 1}`,
        type,
        thumbnailUrl,
        thumbnailLabel: item.thumbnailLabel?.trim() || null,
        videoUrl,
        source: "Google Business Profile reviewMediaItems",
      };
    })
    .filter(Boolean);
  if (items.length === 0) return null;
  return {
    source: "Google Business Profile reviewMediaItems",
    syncedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
}

async function buildCrewMatcher() {
  const [peopleRaw, aliasRaw] = await Promise.all([
    readFile(PEOPLE_PATH, "utf8"),
    readFile(ALIAS_PATH, "utf8"),
  ]);
  const people = JSON.parse(peopleRaw);
  const aliasDoc = JSON.parse(aliasRaw);

  const codeByLowerName = new Map(
    (people.crew?.roster ?? []).map((c) => [c.name.toLowerCase(), c.code]),
  );

  // { regex, code } pairs, longest alias first so "Ah Boy" matches before "Boy".
  const rules = [];
  for (const rule of aliasDoc.aliasRules ?? []) {
    const code = codeByLowerName.get(rule.crewName.toLowerCase());
    if (!code) continue; // crew no longer in the published roster — skip, don't guess
    for (const alias of rule.aliases ?? []) {
      rules.push({ alias, code, regex: new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i") });
    }
  }
  rules.sort((a, b) => b.alias.length - a.alias.length);
  return rules;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchCrewCodes(text, rules) {
  if (!text) return [];
  const found = new Set();
  for (const rule of rules) {
    if (rule.regex.test(text)) found.add(rule.code);
  }
  return [...found];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const token = await getAccessToken();
  const { reviews: gbpReviews, averageRating, totalReviewCount } = await fetchAllReviews(token);
  if (averageRating == null || totalReviewCount == null) {
    throw new Error("GBP response missing averageRating/totalReviewCount");
  }

  const crewRules = await buildCrewMatcher();

  const reviewsDoc = JSON.parse(await readFile(REVIEWS_PATH, "utf8"));
  const existingByUrlRef = new Map(
    reviewsDoc.reviews.filter((r) => r.urlReference).map((r) => [r.urlReference, r]),
  );

  let nextId = reviewsDoc.nextId;
  let added = 0;
  const newlyMatchedCrew = [];

  for (const r of gbpReviews) {
    if (existingByUrlRef.has(r.name)) continue; // already synced

    const reviewText = r.comment ?? "";
    const crewCodes = matchCrewCodes(reviewText, crewRules);
    if (crewCodes.length > 0) newlyMatchedCrew.push({ id: nextId, crewCodes });

    reviewsDoc.reviews.push({
      id: nextId,
      platform: "Google",
      customerName: r.reviewer?.displayName ?? "Anonymous",
      date: (r.createTime ? new Date(r.createTime) : new Date()).toISOString().slice(0, 10),
      star: STAR_MAP[r.starRating] ?? 0,
      review: reviewText,
      photos: serializeMedia(r),
      url: r.reviewReplyUrl ?? null,
      urlReference: r.name,
      // The Google Business Profile API does not report which package a guest
      // booked, and inferring it from review text would be invented attribution.
      // Left null deliberately — but note the cost: /api/reviews-xml is a Google
      // product-review feed and filters on packageSlug, so reviews synced here
      // never reach it. Only 7 of 58 reviews dated 2026 carry a package.
      // Filling this needs booking records or a human, not a heuristic.
      packageSlug: null,
      packageName: null,
      crewCodes,
    });
    nextId += 1;
    added += 1;
  }

  reviewsDoc.nextId = nextId;
  reviewsDoc.lastSynced = new Date().toISOString().slice(0, 10);

  // Same aggregate write sync-google-rating.mjs (Phase 1) used to do alone —
  // consolidated here since this fetch already returns it on every page.
  const ratingDoc = JSON.parse(await readFile(RATING_PATH, "utf8"));
  const googleProfile = ratingDoc.profiles?.find((p) => p.platform === "Google Maps");
  if (!googleProfile) throw new Error(`review-platforms.json has no "Google Maps" profile`);
  const roundedRating = Math.round(averageRating * 10) / 10;
  const today = new Date().toISOString().slice(0, 10);
  const ratingChanged =
    googleProfile.rating !== roundedRating ||
    googleProfile.reviewCount !== totalReviewCount ||
    ratingDoc.platforms?.google !== totalReviewCount;
  googleProfile.rating = roundedRating;
  googleProfile.reviewCount = totalReviewCount;
  googleProfile.verifiedAt = today;
  if (ratingDoc.platforms) ratingDoc.platforms.google = totalReviewCount;
  ratingDoc.average_rating = roundedRating;
  ratingDoc.lastReviewed = today;

  console.log(`New Google reviews: ${added}`);
  if (newlyMatchedCrew.length > 0) {
    console.log("Crew matched on new reviews:", JSON.stringify(newlyMatchedCrew));
  }
  console.log(`Rating: ${roundedRating} / ${totalReviewCount} (changed: ${ratingChanged})`);

  if (added === 0 && !ratingChanged) {
    console.log("No changes.");
    return;
  }

  if (dryRun) {
    console.log("--dry-run: not writing.");
    return;
  }

  if (added > 0) {
    await writeFile(REVIEWS_PATH, JSON.stringify(reviewsDoc, null, 2) + "\n", "utf8");
    console.log("Wrote", REVIEWS_PATH);
  }
  if (ratingChanged) {
    await writeFile(RATING_PATH, JSON.stringify(ratingDoc, null, 2) + "\n", "utf8");
    console.log("Wrote", RATING_PATH);
  }
}

main().catch((err) => {
  console.error("[sync-google-reviews]", err.message);
  process.exit(1);
});
