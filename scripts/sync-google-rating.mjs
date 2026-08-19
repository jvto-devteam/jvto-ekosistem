#!/usr/bin/env node
// Syncs JVTO's live Google Business Profile aggregate rating (average rating +
// total review count) into review-platforms.json — the single source of truth
// jvto-web's getAggregateRating.ts reads (owner decision 2026-08-15: Google
// Maps is the only figure ever presented as "the" JVTO rating).
//
// Phase 1 of the reviews migration (2026-08-19): this syncs ONLY the
// aggregate. It does not fetch or store individual review text/media — that
// is Phase 2, not yet built (see 5-experience-engine/reviews/README.md for
// the one-time manual export that predates this automation and is already
// stale; it is not wired to run again).
//
// Requires env: GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN,
// GBP_ACCOUNT_ID, GBP_LOCATION_ID (same Google Business Profile OAuth app
// jvto-web's /api/review/sync-google used — see that route for provenance).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TARGET_PATH = path.join(
  REPO_ROOT,
  "1-knowledge-and-evidence-core/credentials-and-public-evidence/review-platforms.json",
);

const GBP_TOKEN_URL = "https://oauth2.googleapis.com/token";

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
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function fetchAggregate(token) {
  const accountId = requiredEnv("GBP_ACCOUNT_ID");
  const locationId = requiredEnv("GBP_LOCATION_ID");
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`;

  // GBP returns averageRating/totalReviewCount as location-level aggregates on
  // every page of the reviews list — page 1 alone is sufficient for Phase 1.
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`GBP API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  if (data.averageRating == null || data.totalReviewCount == null) {
    throw new Error(
      `GBP response missing averageRating/totalReviewCount: ${JSON.stringify(data).slice(0, 300)}`,
    );
  }
  return {
    averageRating: Math.round(data.averageRating * 10) / 10,
    totalReviewCount: data.totalReviewCount,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const token = await getAccessToken();
  const { averageRating, totalReviewCount } = await fetchAggregate(token);

  const raw = await readFile(TARGET_PATH, "utf8");
  const doc = JSON.parse(raw);

  const today = new Date().toISOString().slice(0, 10);
  const googleProfile = doc.profiles?.find((p) => p.platform === "Google Maps");
  if (!googleProfile) {
    throw new Error(`review-platforms.json has no profiles[] entry with platform "Google Maps"`);
  }

  const before = {
    rating: googleProfile.rating,
    reviewCount: googleProfile.reviewCount,
    platformsGoogle: doc.platforms?.google,
    averageRating: doc.average_rating,
  };

  googleProfile.rating = averageRating;
  googleProfile.reviewCount = totalReviewCount;
  googleProfile.verifiedAt = today;
  if (doc.platforms) doc.platforms.google = totalReviewCount;
  // Owner decision 2026-08-15: Google Maps is the only figure ever presented
  // as "the" JVTO rating — this top-level field mirrors it exactly, not a
  // cross-platform blend.
  doc.average_rating = averageRating;
  doc.lastReviewed = today;

  const after = {
    rating: googleProfile.rating,
    reviewCount: googleProfile.reviewCount,
    platformsGoogle: doc.platforms?.google,
    averageRating: doc.average_rating,
  };

  console.log("Before:", JSON.stringify(before));
  console.log("After: ", JSON.stringify(after));

  const unchanged =
    before.rating === after.rating &&
    before.reviewCount === after.reviewCount &&
    before.platformsGoogle === after.platformsGoogle &&
    before.averageRating === after.averageRating;

  if (unchanged) {
    console.log("No change.");
    return;
  }

  if (dryRun) {
    console.log("--dry-run: not writing.");
    return;
  }

  await writeFile(TARGET_PATH, JSON.stringify(doc, null, 2) + "\n", "utf8");
  console.log("Wrote", TARGET_PATH);
}

main().catch((err) => {
  console.error("[sync-google-rating]", err.message);
  process.exit(1);
});
