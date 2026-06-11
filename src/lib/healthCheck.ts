// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthBookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  description: string;
  summary: string;
}

export interface DuplicateGroup {
  normalizedUrl: string;
  bookmarks: { id: string; title: string; url: string }[];
}

export interface BrokenLink {
  id: string;
  title: string;
  url: string;
  status: number | "timeout" | "error";
}

export interface MetadataIssue {
  id: string;
  title: string;
  url: string;
}

export interface ScoreHistoryEntry {
  score: number;
  checkedAt: string; // ISO timestamp
}

export interface HealthReport {
  healthScore: number;
  duplicateGroups: DuplicateGroup[];
  brokenLinks: BrokenLink[];
  missingTags: MetadataIssue[];
  missingDescriptions: MetadataIssue[];
  missingSummaries: MetadataIssue[];
  recommendations: string[];
  scoreHistory: ScoreHistoryEntry[];
  checkedAt: string;
}

// ─── In-process 6-hour cache (per userId) ─────────────────────────────────────

interface CacheEntry {
  report: HealthReport;
  expiresAt: number; // epoch ms
}

const healthCache = new Map<string, CacheEntry>();

/** Max score history entries retained per user (last N checks). */
const MAX_HISTORY = 10;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** In-process score history per userId (persists across cache invalidations). */
const scoreHistoryStore = new Map<string, ScoreHistoryEntry[]>();

function getCachedReport(userId: string): HealthReport | null {
  const entry = healthCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    healthCache.delete(userId);
    return null;
  }
  return entry.report;
}

function setCachedReport(userId: string, report: HealthReport): void {
  healthCache.set(userId, {
    report,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function appendScoreHistory(
  userId: string,
  score: number,
  checkedAt: string
): ScoreHistoryEntry[] {
  const existing = scoreHistoryStore.get(userId) ?? [];
  const updated: ScoreHistoryEntry[] = [
    ...existing,
    { score, checkedAt },
  ].slice(-MAX_HISTORY);
  scoreHistoryStore.set(userId, updated);
  return updated;
}

function getScoreHistory(userId: string): ScoreHistoryEntry[] {
  return scoreHistoryStore.get(userId) ?? [];
}

// ─── URL Normalisation ────────────────────────────────────────────────────────

const TRACKED_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "referrer",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
]);

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim().toLowerCase());
    // Strip www.
    u.hostname = u.hostname.replace(/^www\./, "");
    // Strip tracking query params
    TRACKED_PARAMS.forEach((p) => u.searchParams.delete(p));
    // Strip trailing slash from pathname
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    // Drop hash
    u.hash = "";
    return u.toString();
  } catch {
    return raw.trim().toLowerCase();
  }
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

function detectDuplicates(bookmarks: HealthBookmark[]): DuplicateGroup[] {
  const groups = new Map<string, HealthBookmark[]>();

  for (const b of bookmarks) {
    const key = normalizeUrl(b.url);
    const existing = groups.get(key) ?? [];
    existing.push(b);
    groups.set(key, existing);
  }

  const duplicateGroups: DuplicateGroup[] = [];
  for (const [normalizedUrl, members] of groups) {
    if (members.length >= 2) {
      duplicateGroups.push({
        normalizedUrl,
        bookmarks: members.map((b) => ({
          id: b.id,
          title: b.title,
          url: b.url,
        })),
      });
    }
  }

  return duplicateGroups;
}

// ─── Broken Link Detection ────────────────────────────────────────────────────

const LINK_CHECK_CONCURRENCY = 3;
const LINK_CHECK_TIMEOUT_MS = 5000;

/** Returns true if the URL is a publicly reachable http/https URL worth checking. */
function isCheckableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function checkSingleLink(
  bookmark: HealthBookmark
): Promise<BrokenLink | null> {
  if (!isCheckableUrl(bookmark.url)) return null;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    LINK_CHECK_TIMEOUT_MS
  );

  try {
    const response = await fetch(bookmark.url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "BookmarkHealthCheck/1.0",
      },
    });

    clearTimeout(timer);

    if (response.status === 404 || response.status >= 500) {
      return {
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        status: response.status,
      };
    }

    return null; // healthy
  } catch (err) {
    clearTimeout(timer);

    const isTimeout =
      err instanceof Error && err.name === "AbortError";

    return {
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      status: isTimeout ? "timeout" : "error",
    };
  }
}

async function detectBrokenLinks(
  bookmarks: HealthBookmark[]
): Promise<BrokenLink[]> {
  const results: BrokenLink[] = [];
  const checkable = bookmarks.filter((b) => isCheckableUrl(b.url));

  // Process in batches of LINK_CHECK_CONCURRENCY
  for (let i = 0; i < checkable.length; i += LINK_CHECK_CONCURRENCY) {
    const batch = checkable.slice(i, i + LINK_CHECK_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((b) => checkSingleLink(b))
    );
    for (const r of batchResults) {
      if (r !== null) results.push(r);
    }
  }

  return results;
}

// ─── Metadata Analysis ────────────────────────────────────────────────────────

function detectMissingTags(bookmarks: HealthBookmark[]): MetadataIssue[] {
  return bookmarks
    .filter((b) => b.tags.length === 0)
    .map((b) => ({ id: b.id, title: b.title, url: b.url }));
}

function detectMissingDescriptions(
  bookmarks: HealthBookmark[]
): MetadataIssue[] {
  return bookmarks
    .filter((b) => !b.description || b.description.trim() === "")
    .map((b) => ({ id: b.id, title: b.title, url: b.url }));
}

function detectMissingSummaries(
  bookmarks: HealthBookmark[]
): MetadataIssue[] {
  return bookmarks
    .filter((b) => !b.summary || b.summary.trim() === "")
    .map((b) => ({ id: b.id, title: b.title, url: b.url }));
}

// ─── Health Score ─────────────────────────────────────────────────────────────

function calculateHealthScore(
  total: number,
  duplicateGroups: DuplicateGroup[],
  brokenLinks: BrokenLink[],
  missingTags: MetadataIssue[],
  missingSummaries: MetadataIssue[]
): number {
  if (total === 0) return 100;

  // Count the number of redundant duplicate bookmarks (extras beyond first)
  const duplicateCount = duplicateGroups.reduce(
    (acc, g) => acc + (g.bookmarks.length - 1),
    0
  );

  let score = 100;
  score -= brokenLinks.length * 10;
  score -= missingTags.length * 3;
  score -= missingSummaries.length * 3;
  score -= duplicateCount * 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Recommendations ──────────────────────────────────────────────────────────

function buildRecommendations(
  healthScore: number,
  duplicateGroups: DuplicateGroup[],
  brokenLinks: BrokenLink[],
  missingTags: MetadataIssue[],
  missingDescriptions: MetadataIssue[],
  missingSummaries: MetadataIssue[]
): string[] {
  const recs: string[] = [];

  const duplicateCount = duplicateGroups.reduce(
    (acc, g) => acc + (g.bookmarks.length - 1),
    0
  );

  if (duplicateCount > 0) {
    recs.push(
      `Remove ${duplicateCount} duplicate bookmark${duplicateCount === 1 ? "" : "s"} to keep your library clean.`
    );
  }

  if (brokenLinks.length > 0) {
    recs.push(
      `Fix or remove ${brokenLinks.length} broken link${brokenLinks.length === 1 ? "" : "s"} — they no longer resolve correctly.`
    );
  }

  if (missingTags.length > 0) {
    recs.push(
      `Add tags to ${missingTags.length} bookmark${missingTags.length === 1 ? "" : "s"} to improve search and AI recommendations.`
    );
  }

  if (missingDescriptions.length > 0) {
    recs.push(
      `Add descriptions to ${missingDescriptions.length} bookmark${missingDescriptions.length === 1 ? "" : "s"} to provide context for future reference.`
    );
  }

  if (missingSummaries.length > 0) {
    recs.push(
      `Generate AI summaries for ${missingSummaries.length} bookmark${missingSummaries.length === 1 ? "" : "s"} to unlock better AI insights and recommendations.`
    );
  }

  if (healthScore >= 90 && recs.length === 0) {
    recs.push("Your bookmark library is in excellent health! 🎉 Keep it up.");
  }

  return recs;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Run a full health check on a user's bookmark collection.
 * Results are cached in-process for 6 hours per userId.
 * Health score history is retained for up to 10 checks.
 *
 * @param userId        - Authenticated user ID (used as cache key).
 * @param bookmarks     - Full list of user bookmarks to analyse.
 * @param forceRefresh  - If true, bypass cache and re-run the check.
 */
export async function runHealthCheck(
  userId: string,
  bookmarks: HealthBookmark[],
  forceRefresh = false
): Promise<HealthReport> {
  if (!forceRefresh) {
    const cached = getCachedReport(userId);
    if (cached) return cached;
  }

  const checkedAt = new Date().toISOString();

  // Run all analyses
  const [duplicateGroups, brokenLinks] = await Promise.all([
    Promise.resolve(detectDuplicates(bookmarks)),
    detectBrokenLinks(bookmarks),
  ]);

  const missingTags = detectMissingTags(bookmarks);
  const missingDescriptions = detectMissingDescriptions(bookmarks);
  const missingSummaries = detectMissingSummaries(bookmarks);

  const healthScore = calculateHealthScore(
    bookmarks.length,
    duplicateGroups,
    brokenLinks,
    missingTags,
    missingSummaries
  );

  const recommendations = buildRecommendations(
    healthScore,
    duplicateGroups,
    brokenLinks,
    missingTags,
    missingDescriptions,
    missingSummaries
  );

  // Persist score history
  const scoreHistory = appendScoreHistory(userId, healthScore, checkedAt);

  const report: HealthReport = {
    healthScore,
    duplicateGroups,
    brokenLinks,
    missingTags,
    missingDescriptions,
    missingSummaries,
    recommendations,
    scoreHistory,
    checkedAt,
  };

  setCachedReport(userId, report);
  return report;
}

/**
 * Retrieve the cached health report without running a new check.
 * Returns null if no cached report exists.
 */
export function getCachedHealthReport(userId: string): HealthReport | null {
  return getCachedReport(userId);
}

/**
 * Invalidate the cached health report for a user.
 */
export function invalidateHealthCache(userId: string): void {
  healthCache.delete(userId);
}

/**
 * Retrieve only the score history for a user without running a new check.
 */
export function getUserScoreHistory(userId: string): ScoreHistoryEntry[] {
  return getScoreHistory(userId);
}
