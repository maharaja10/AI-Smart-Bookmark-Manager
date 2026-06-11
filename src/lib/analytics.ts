import mongoose from "mongoose";
import Bookmark from "@/models/Bookmark";
import Folder from "@/models/Folder";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OverviewMetrics {
  totalBookmarks: number;
  totalFolders: number;
  favoritesCount: number;
  readLaterCount: number;
  addedThisWeek: number;
  addedThisMonth: number;
}

export interface GrowthPoint {
  label: string;
  count: number;
}

export interface TagAnalytics {
  tag: string;
  count: number;
}

export interface FolderAnalytics {
  folderId: string;
  name: string;
  count: number;
  percentage: number;
}

export interface ActivityHeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // 0=none, 4=highest
}

export interface MostActiveDay {
  dayName: string;
  averageCount: number;
}

export interface SavingStreak {
  currentStreak: number;
  bestStreak: number;
}

export interface FavoritesAnalytics {
  total: number;
  percentage: number;
}

export interface ReadLaterAnalyticsData {
  total: number;
  percentage: number;
}

export type GrowthRange = "7d" | "30d" | "6m" | "12m";

export interface AnalyticsSummary {
  overview: OverviewMetrics;
  growth: Record<GrowthRange, GrowthPoint[]>;
  topTags: TagAnalytics[];
  folderDistribution: FolderAnalytics[];
  favoritesAnalytics: FavoritesAnalytics;
  readLaterAnalytics: ReadLaterAnalyticsData;
  mostActiveDay: MostActiveDay;
  savingStreak: SavingStreak;
  heatmap: ActivityHeatmapDay[];
  insights: string[];
  generatedAt: string;
}

// ─── In-process 6-hour cache (per userId) ────────────────────────────────────

interface CacheEntry {
  summary: AnalyticsSummary;
  expiresAt: number;
}

const analyticsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function getCached(userId: string): AnalyticsSummary | null {
  const entry = analyticsCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    analyticsCache.delete(userId);
    return null;
  }
  return entry.summary;
}

function setCache(userId: string, summary: AnalyticsSummary): void {
  analyticsCache.set(userId, {
    summary,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateAnalyticsCache(userId: string): void {
  analyticsCache.delete(userId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/** Day names indexed 0=Sunday … 6=Saturday */
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ─── Overview Metrics ─────────────────────────────────────────────────────────

async function getOverviewMetrics(
  userId: string
): Promise<OverviewMetrics> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [
    totalBookmarks,
    totalFolders,
    favoritesCount,
    readLaterCount,
    addedThisWeek,
    addedThisMonth,
  ] = await Promise.all([
    Bookmark.countDocuments({ userId }),
    Folder.countDocuments({ userId }),
    Bookmark.countDocuments({ userId, isFavorite: true }),
    Bookmark.countDocuments({ userId, isReadLater: true }),
    Bookmark.countDocuments({ userId, createdAt: { $gte: weekAgo } }),
    Bookmark.countDocuments({ userId, createdAt: { $gte: monthAgo } }),
  ]);

  return {
    totalBookmarks,
    totalFolders,
    favoritesCount,
    readLaterCount,
    addedThisWeek,
    addedThisMonth,
  };
}

// ─── Growth Analytics ─────────────────────────────────────────────────────────

async function getGrowthData(
  userId: string,
  range: GrowthRange
): Promise<GrowthPoint[]> {
  const now = new Date();
  let startDate: Date;
  let groupFormat: string;
  let labelFn: (dateStr: string) => string;

  switch (range) {
    case "7d":
      startDate = addDays(now, -6);
      groupFormat = "%Y-%m-%d";
      labelFn = (d) => {
        const date = new Date(d + "T00:00:00Z");
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
      };
      break;
    case "30d":
      startDate = addDays(now, -29);
      groupFormat = "%Y-%m-%d";
      labelFn = (d) => {
        const date = new Date(d + "T00:00:00Z");
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
      };
      break;
    case "6m":
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 5);
      startDate.setDate(1);
      groupFormat = "%Y-%m";
      labelFn = (d) => {
        const [year, month] = d.split("-");
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          1
        ).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      };
      break;
    case "12m":
    default:
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
      groupFormat = "%Y-%m";
      labelFn = (d) => {
        const [year, month] = d.split("-");
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          1
        ).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      };
      break;
  }

  const rawData = await Bookmark.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startOfDay(startDate) },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: groupFormat, date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dataMap = new Map<string, number>(
    rawData.map((r: { _id: string; count: number }) => [r._id, r.count])
  );

  // Fill gaps
  const points: GrowthPoint[] = [];

  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(now, -i);
      const key = toYMD(d);
      points.push({ label: labelFn(key), count: dataMap.get(key) ?? 0 });
    }
  } else {
    const months = range === "6m" ? 6 : 12;
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      points.push({ label: labelFn(key), count: dataMap.get(key) ?? 0 });
    }
  }

  return points;
}

// ─── Top Tags ─────────────────────────────────────────────────────────────────

async function getTopTags(userId: string, limit = 10): Promise<TagAnalytics[]> {
  const result = await Bookmark.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: { path: "$tags", preserveNullAndEmptyArrays: false } },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return result.map((r: { _id: string; count: number }) => ({
    tag: r._id,
    count: r.count,
  }));
}

// ─── Folder Distribution ──────────────────────────────────────────────────────

async function getFolderDistribution(
  userId: string
): Promise<FolderAnalytics[]> {
  const [folderCounts, totalBookmarks] = await Promise.all([
    Bookmark.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$folderId",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
    Bookmark.countDocuments({ userId }),
  ]);

  if (totalBookmarks === 0) return [];

  // Collect folder IDs (non-null)
  const folderIds = folderCounts
    .filter((r: { _id: unknown }) => r._id != null)
    .map((r: { _id: unknown }) => r._id);

  // Fetch folder names
  const folders = (await Folder.find({ _id: { $in: folderIds } })
    .select("_id name")
    .lean()) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string }>;

  const folderNameMap = new Map<string, string>(
    folders.map((f) => [String(f._id), f.name])
  );

  const distribution: FolderAnalytics[] = folderCounts.map(
    (r: { _id: unknown; count: number }) => {
      const fId = r._id ? String(r._id) : null;
      const name = fId ? (folderNameMap.get(fId) ?? "Unknown Folder") : "Uncategorized";
      const percentage = Math.round((r.count / totalBookmarks) * 100);
      return {
        folderId: fId ?? "uncategorized",
        name,
        count: r.count,
        percentage,
      };
    }
  );

  return distribution;
}

// ─── Most Active Day ──────────────────────────────────────────────────────────

async function getMostActiveDay(userId: string): Promise<MostActiveDay> {
  const result = await Bookmark.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: { $dayOfWeek: "$createdAt" }, // 1=Sunday … 7=Saturday
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);

  if (result.length === 0) {
    return { dayName: "N/A", averageCount: 0 };
  }

  const dayIndex = (result[0]._id - 1) % 7; // convert 1-7 → 0-6
  const count = result[0].count;

  // Get total weeks spanned for average
  const earliest = await Bookmark.findOne({ userId })
    .sort({ createdAt: 1 })
    .select("createdAt")
    .lean() as { createdAt: Date } | null;

  let weekCount = 1;
  if (earliest) {
    const msSpan = Date.now() - new Date(earliest.createdAt).getTime();
    weekCount = Math.max(1, Math.ceil(msSpan / (7 * 24 * 60 * 60 * 1000)));
  }

  const averageCount = Math.round(count / weekCount);

  return {
    dayName: DAY_NAMES[dayIndex],
    averageCount,
  };
}

// ─── Saving Streak ────────────────────────────────────────────────────────────

async function getSavingStreak(userId: string): Promise<SavingStreak> {
  // Get all unique days with bookmarks, sorted descending
  const result = await Bookmark.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  const days: Set<string> = new Set(result.map((r: { _id: string }) => r._id));

  if (days.size === 0) return { currentStreak: 0, bestStreak: 0 };

  const sortedDays = [...days].sort().reverse(); // most recent first

  // Current streak: from today or yesterday backward
  const todayStr = toYMD(new Date());
  const yesterdayStr = toYMD(addDays(new Date(), -1));

  let currentStreak = 0;
  const startsFromToday =
    sortedDays[0] === todayStr || sortedDays[0] === yesterdayStr;

  if (startsFromToday) {
    let checkDate =
      sortedDays[0] === todayStr ? new Date() : addDays(new Date(), -1);
    while (days.has(toYMD(checkDate))) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  }

  // Best streak: traverse all days
  const allSortedAsc = [...days].sort();
  let bestStreak = 0;
  let streak = 0;

  for (let i = 0; i < allSortedAsc.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(allSortedAsc[i - 1] + "T00:00:00Z");
      const curr = new Date(allSortedAsc[i] + "T00:00:00Z");
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );
      streak = diffDays === 1 ? streak + 1 : 1;
    }
    bestStreak = Math.max(bestStreak, streak);
  }

  return { currentStreak, bestStreak };
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

/** Compute activity level 0-4 based on count percentiles */
function computeLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

async function getActivityHeatmap(
  userId: string
): Promise<ActivityHeatmapDay[]> {
  const now = new Date();
  const startDate = addDays(now, -364); // last 365 days

  const result = await Bookmark.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startOfDay(startDate) },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const dataMap = new Map<string, number>(
    result.map((r: { _id: string; count: number }) => [r._id, r.count])
  );

  const maxCount = Math.max(0, ...dataMap.values());

  const heatmap: ActivityHeatmapDay[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = addDays(now, -i);
    const key = toYMD(d);
    const count = dataMap.get(key) ?? 0;
    heatmap.push({
      date: key,
      count,
      level: computeLevel(count, maxCount || 1),
    });
  }

  return heatmap;
}

// ─── Insights Generation (Deterministic, No AI) ───────────────────────────────

function generateInsights(summary: {
  overview: OverviewMetrics;
  topTags: TagAnalytics[];
  folderDistribution: FolderAnalytics[];
  favoritesAnalytics: FavoritesAnalytics;
  readLaterAnalytics: ReadLaterAnalyticsData;
  mostActiveDay: MostActiveDay;
  savingStreak: SavingStreak;
}): string[] {
  const insights: string[] = [];
  const {
    overview,
    topTags,
    folderDistribution,
    favoritesAnalytics,
    readLaterAnalytics,
    mostActiveDay,
    savingStreak,
  } = summary;

  // Total bookmarks
  if (overview.totalBookmarks > 0) {
    insights.push(
      `You have saved a total of ${overview.totalBookmarks} bookmark${overview.totalBookmarks !== 1 ? "s" : ""} in your collection.`
    );
  }

  // Top folder
  if (folderDistribution.length > 0) {
    const topFolder = folderDistribution[0];
    insights.push(
      `Most bookmarks belong to "${topFolder.name}" (${topFolder.count} bookmarks, ${topFolder.percentage}% of your collection).`
    );
  }

  // Top tag
  if (topTags.length > 0) {
    insights.push(
      `"${topTags[0].tag}" is your most saved topic with ${topTags[0].count} bookmark${topTags[0].count !== 1 ? "s" : ""}.`
    );
  }

  // This month
  if (overview.addedThisMonth > 0) {
    insights.push(
      `You saved ${overview.addedThisMonth} bookmark${overview.addedThisMonth !== 1 ? "s" : ""} this month.`
    );
  }

  // This week
  if (overview.addedThisWeek > 0) {
    insights.push(
      `You've added ${overview.addedThisWeek} bookmark${overview.addedThisWeek !== 1 ? "s" : ""} in the last 7 days — great momentum!`
    );
  }

  // Favorites
  if (overview.totalBookmarks > 0) {
    insights.push(
      `Favorites make up ${favoritesAnalytics.percentage}% of your collection (${favoritesAnalytics.total} bookmarks).`
    );
  }

  // Read Later
  if (readLaterAnalytics.total > 0) {
    insights.push(
      `You have ${readLaterAnalytics.total} bookmark${readLaterAnalytics.total !== 1 ? "s" : ""} queued for later reading (${readLaterAnalytics.percentage}% of your collection).`
    );
  }

  // Most active day
  if (mostActiveDay.dayName !== "N/A") {
    insights.push(
      `Your most active saving day is ${mostActiveDay.dayName}, averaging ${mostActiveDay.averageCount} bookmark${mostActiveDay.averageCount !== 1 ? "s" : ""} per week.`
    );
  }

  // Streak
  if (savingStreak.currentStreak > 1) {
    insights.push(
      `You're on a ${savingStreak.currentStreak}-day saving streak! Keep it up! 🔥`
    );
  }
  if (savingStreak.bestStreak > 0) {
    insights.push(
      `Your best saving streak was ${savingStreak.bestStreak} consecutive day${savingStreak.bestStreak !== 1 ? "s" : ""}.`
    );
  }

  // Tag diversity
  if (topTags.length >= 5) {
    insights.push(
      `You use ${topTags.length >= 10 ? "at least 10" : topTags.length} distinct tags — good for discoverability and organization.`
    );
  }

  return insights.slice(0, 10);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Generate a complete analytics summary for a user.
 * Results are cached in-process for 6 hours per userId.
 *
 * @param userId       - Authenticated user's ID (used as cache key).
 * @param forceRefresh - If true, bypass cache and recompute.
 */
export async function generateAnalytics(
  userId: string,
  forceRefresh = false
): Promise<AnalyticsSummary> {
  if (!forceRefresh) {
    const cached = getCached(userId);
    if (cached) return cached;
  }

  // Run all aggregations concurrently
  const [
    overview,
    growth7d,
    growth30d,
    growth6m,
    growth12m,
    topTags,
    folderDistribution,
    mostActiveDay,
    savingStreak,
    heatmap,
  ] = await Promise.all([
    getOverviewMetrics(userId),
    getGrowthData(userId, "7d"),
    getGrowthData(userId, "30d"),
    getGrowthData(userId, "6m"),
    getGrowthData(userId, "12m"),
    getTopTags(userId),
    getFolderDistribution(userId),
    getMostActiveDay(userId),
    getSavingStreak(userId),
    getActivityHeatmap(userId),
  ]);

  const favoritesAnalytics: FavoritesAnalytics = {
    total: overview.favoritesCount,
    percentage:
      overview.totalBookmarks > 0
        ? Math.round((overview.favoritesCount / overview.totalBookmarks) * 100)
        : 0,
  };

  const readLaterAnalytics: ReadLaterAnalyticsData = {
    total: overview.readLaterCount,
    percentage:
      overview.totalBookmarks > 0
        ? Math.round((overview.readLaterCount / overview.totalBookmarks) * 100)
        : 0,
  };

  const insights = generateInsights({
    overview,
    topTags,
    folderDistribution,
    favoritesAnalytics,
    readLaterAnalytics,
    mostActiveDay,
    savingStreak,
  });

  const summary: AnalyticsSummary = {
    overview,
    growth: {
      "7d": growth7d,
      "30d": growth30d,
      "6m": growth6m,
      "12m": growth12m,
    },
    topTags,
    folderDistribution,
    favoritesAnalytics,
    readLaterAnalytics,
    mostActiveDay,
    savingStreak,
    heatmap,
    insights,
    generatedAt: new Date().toISOString(),
  };

  setCache(userId, summary);
  return summary;
}
