import mongoose from "mongoose";
import Bookmark from "@/models/Bookmark";
import Goal, { IGoal } from "@/models/Goal";
import Achievement, { IAchievement } from "@/models/Achievement";
import ActivityLog from "@/models/ActivityLog";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface GoalProgressInfo {
  _id: string;
  title: string;
  goalType: string;
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  percentComplete: number;
  completed: boolean;
}

export interface ReadingStats {
  totalRead: number;
  totalUnread: number;
  readThisWeek: number;
  readThisMonth: number;
  readPercentage: number;
}

export interface BadgeInfo {
  badgeCode: string;
  earned: boolean;
  earnedAt: string | null;
  name: string;
  description: string;
}

export interface TagProgress {
  tag: string;
  progressPercent: number;
  totalCount: number;
  readCount: number;
  favoritesCount: number;
}

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
}

export interface ProductivitySummary {
  readingStats: ReadingStats;
  streaks: StreakInfo;
  tagProgressList: TagProgress[];
  activeGoals: GoalProgressInfo[];
  recentBadges: BadgeInfo[];
  allBadges: BadgeInfo[];
  insights: string[];
  generatedAt: string;
}

// ─── Badge Configurations ────────────────────────────────────────────────────

export const AVAILABLE_BADGES = [
  {
    code: "FIRST_BOOKMARK",
    name: "Initiate the Journey",
    description: "Saved your first bookmark.",
  },
  {
    code: "10_BOOKMARKS",
    name: "Information Collector",
    description: "Saved 10 bookmarks in total.",
  },
  {
    code: "50_BOOKMARKS",
    name: "Digital Librarian",
    description: "Saved 50 bookmarks in total.",
  },
  {
    code: "100_BOOKMARKS",
    name: "Archivist",
    description: "Saved 100 bookmarks in total.",
  },
  {
    code: "FIRST_READ",
    name: "First Step to Wisdom",
    description: "Read your first bookmark.",
  },
  {
    code: "10_READS",
    name: "Active Learner",
    description: "Marked 10 bookmarks as read.",
  },
  {
    code: "50_READS",
    name: "Scholar of the Web",
    description: "Marked 50 bookmarks as read.",
  },
  {
    code: "FIRST_FAVORITE",
    name: "Curator",
    description: "Added your first bookmark to favorites.",
  },
  {
    code: "10_FAVORITES",
    name: "Gourmet Reader",
    description: "Added 10 bookmarks to favorites.",
  },
  {
    code: "STREAK_7",
    name: "Consistency Catalyst",
    description: "Maintained a 7-day active streak.",
  },
  {
    code: "STREAK_30",
    name: "Routine Builder",
    description: "Maintained a 30-day active streak.",
  },
  {
    code: "PRODUCTIVITY_MASTER",
    name: "Productivity Master",
    description: "Successfully completed at least 3 goals.",
  },
];

// ─── 6-Hour Cache ────────────────────────────────────────────────────────────

interface CacheEntry {
  summary: ProductivitySummary;
  expiresAt: number;
}

const productivityCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function getCachedProductivity(userId: string): ProductivitySummary | null {
  const entry = productivityCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    productivityCache.delete(userId);
    return null;
  }
  return entry.summary;
}

export function setCachedProductivity(userId: string, summary: ProductivitySummary): void {
  productivityCache.set(userId, {
    summary,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateProductivityCache(userId: string): void {
  productivityCache.delete(userId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Streak Calculation using ActivityLog ────────────────────────────────────

async function calculateActivityStreak(userId: string): Promise<StreakInfo> {
  const result = await ActivityLog.aggregate([
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

  const days = new Set(result.map((r: { _id: string }) => r._id));
  if (days.size === 0) return { currentStreak: 0, bestStreak: 0 };

  const sortedDays = [...days].sort().reverse(); // most recent first
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

  // Best streak
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

// ─── Core Productivity Calculation & Goal Evaluation ─────────────────────────

export async function generateProductivitySummary(
  userId: string,
  bypassCache = false
): Promise<ProductivitySummary> {
  if (!bypassCache) {
    const cached = getCachedProductivity(userId);
    if (cached) return cached;
  }

  // 1. Fetch Core Statistics in parallel
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date();
  startOfMonth.setDate(now.getDate() - 30);

  const [
    totalCount,
    totalRead,
    totalUnread,
    readThisWeek,
    readThisMonth,
    totalFavorites,
    streaks,
    completedGoalsCount,
  ] = await Promise.all([
    Bookmark.countDocuments({ userId }),
    Bookmark.countDocuments({ userId, isRead: true }),
    Bookmark.countDocuments({ userId, isRead: false }),
    Bookmark.countDocuments({ userId, isRead: true, readAt: { $gte: startOfWeek } }),
    Bookmark.countDocuments({ userId, isRead: true, readAt: { $gte: startOfMonth } }),
    Bookmark.countDocuments({ userId, isFavorite: true }),
    calculateActivityStreak(userId),
    Goal.countDocuments({ userId, completed: true }),
  ]);

  const readPercentage =
    totalCount === 0 ? 0 : Math.round((totalRead / totalCount) * 100);

  const readingStats: ReadingStats = {
    totalRead,
    totalUnread,
    readThisWeek,
    readThisMonth,
    readPercentage,
  };

  // 2. Evaluate Active Goals dynamically
  const activeGoalsInDb = await Goal.find({
    userId,
    completed: false,
    endDate: { $gte: now },
  }).exec();

  for (const goal of activeGoalsInDb) {
    let progress = 0;
    const start = goal.startDate;
    const end = goal.endDate;

    if (goal.goalType === "bookmarks_saved") {
      progress = await Bookmark.countDocuments({
        userId,
        createdAt: { $gte: start, $lte: end },
      });
    } else if (goal.goalType === "bookmarks_read") {
      progress = await Bookmark.countDocuments({
        userId,
        isRead: true,
        readAt: { $gte: start, $lte: end },
      });
    } else if (goal.goalType === "favorites_added") {
      progress = await Bookmark.countDocuments({
        userId,
        isFavorite: true,
        createdAt: { $gte: start, $lte: end }, // counts bookmarks saved and favorited in range
      });
    } else if (goal.goalType === "readlater_completed") {
      progress = await Bookmark.countDocuments({
        userId,
        isRead: true,
        isReadLater: true,
        readAt: { $gte: start, $lte: end },
      });
    } else if (goal.goalType === "custom_learning") {
      const lowerTitle = goal.title.toLowerCase();
      const match = ["ai", "frontend", "backend", "system design", "devops", "data science"].find((t) =>
        lowerTitle.includes(t)
      );

      if (match) {
        progress = await Bookmark.countDocuments({
          userId,
          isRead: true,
          tags: match,
          readAt: { $gte: start, $lte: end },
        });
      } else {
        progress = await Bookmark.countDocuments({
          userId,
          isRead: true,
          readAt: { $gte: start, $lte: end },
        });
      }
    }

    goal.currentValue = progress;
    if (progress >= goal.targetValue) {
      goal.completed = true;
    }
    await goal.save();
  }

  // Fetch updated active goals list to return to UI
  const updatedActiveGoals = await Goal.find({
    userId,
    completed: false,
  })
    .sort({ endDate: 1 })
    .lean() as unknown as IGoal[];

  const activeGoals: GoalProgressInfo[] = updatedActiveGoals.map((g) => {
    const end = new Date(g.endDate);
    const timeDiff = end.getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
    const percentComplete = g.targetValue === 0 ? 0 : Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));

    return {
      _id: String(g._id),
      title: g.title,
      goalType: g.goalType,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      startDate: g.startDate.toISOString(),
      endDate: g.endDate.toISOString(),
      daysRemaining,
      percentComplete,
      completed: g.completed,
    };
  });

  // 3. Evaluate Badge Awards (Deterministic)
  const earnedBadgesInDb = await Achievement.find({ userId }).select("badgeCode").lean();
  const earnedCodes = new Set(earnedBadgesInDb.map((a: any) => a.badgeCode));

  const qualifyCheck = (code: string): boolean => {
    switch (code) {
      case "FIRST_BOOKMARK":
        return totalCount >= 1;
      case "10_BOOKMARKS":
        return totalCount >= 10;
      case "50_BOOKMARKS":
        return totalCount >= 50;
      case "100_BOOKMARKS":
        return totalCount >= 100;
      case "FIRST_READ":
        return totalRead >= 1;
      case "10_READS":
        return totalRead >= 10;
      case "50_READS":
        return totalRead >= 50;
      case "FIRST_FAVORITE":
        return totalFavorites >= 1;
      case "10_FAVORITES":
        return totalFavorites >= 10;
      case "STREAK_7":
        return streaks.currentStreak >= 7;
      case "STREAK_30":
        return streaks.currentStreak >= 30;
      case "PRODUCTIVITY_MASTER":
        return completedGoalsCount >= 3;
      default:
        return false;
    }
  };

  const newAwards: string[] = [];
  for (const badge of AVAILABLE_BADGES) {
    if (!earnedCodes.has(badge.code) && qualifyCheck(badge.code)) {
      newAwards.push(badge.code);
    }
  }

  if (newAwards.length > 0) {
    try {
      await Achievement.insertMany(
        newAwards.map((code) => ({
          userId,
          badgeCode: code,
          earnedAt: new Date(),
        })),
        { ordered: false } // continues inserting others if one fails due to duplicate key race condition
      );
    } catch (err) {
      console.error("Duplicate key or insert issue during badge award (safe):", err);
    }
  }

  // Refetch full achievement logs to represent final state
  const finalEarned = await Achievement.find({ userId }).sort({ earnedAt: -1 }).lean() as any[];
  const finalEarnedMap = new Map(finalEarned.map((a) => [a.badgeCode, a.earnedAt.toISOString()]));

  const allBadges: BadgeInfo[] = AVAILABLE_BADGES.map((b) => ({
    badgeCode: b.code,
    name: b.name,
    description: b.description,
    earned: finalEarnedMap.has(b.code),
    earnedAt: finalEarnedMap.get(b.code) || null,
  }));

  const recentBadges = allBadges
    .filter((b) => b.earned)
    .sort((a, b) => new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime())
    .slice(0, 3);

  // 4. Learning progress by tags
  const tagsList = ["ai", "frontend", "backend", "system design", "devops", "data science"];
  const tagProgressList: TagProgress[] = [];

  for (const rawTag of tagsList) {
    const [tCount, tRead, tFav] = await Promise.all([
      Bookmark.countDocuments({ userId, tags: rawTag }),
      Bookmark.countDocuments({ userId, tags: rawTag, isRead: true }),
      Bookmark.countDocuments({ userId, tags: rawTag, isFavorite: true }),
    ]);

    const progressPercent =
      tCount === 0
        ? 0
        : Math.min(
            100,
            Math.round(((tRead * 0.7 + tFav * 0.3) / tCount) * 100)
          );

    tagProgressList.push({
      tag: rawTag.toUpperCase(),
      progressPercent,
      totalCount: tCount,
      readCount: tRead,
      favoritesCount: tFav,
    });
  }

  // 5. Smart Insights (Deterministic logic)
  const insights: string[] = [];

  // Streak Insight
  if (streaks.currentStreak > 0) {
    insights.push(`You are currently on a ${streaks.currentStreak}-day active productivity streak. Keep it going! 🔥`);
  } else {
    insights.push("Save or edit a bookmark, or read an article today to initiate an active streak!");
  }

  // Reading Goals Insight
  if (activeGoals.length > 0) {
    const readingGoals = activeGoals.filter((g) => g.goalType === "bookmarks_read");
    if (readingGoals.length > 0) {
      const avgProgress = Math.round(
        readingGoals.reduce((sum, g) => sum + g.percentComplete, 0) / readingGoals.length
      );
      insights.push(`You have completed an average of ${avgProgress}% of your active reading goals.`);
    }
  }

  // Tags study insight
  const sortedTags = [...tagProgressList].sort((a, b) => b.progressPercent - a.progressPercent);
  if (sortedTags[0] && sortedTags[0].totalCount > 0) {
    insights.push(`${sortedTags[0].tag} is your most studied topic with ${sortedTags[0].progressPercent}% progress.`);
  }

  // Achievement count insight
  const earnedThisMonthCount = finalEarned.filter((a) => {
    const date = new Date(a.earnedAt);
    return date.getTime() >= startOfMonth.getTime();
  }).length;

  if (earnedThisMonthCount > 0) {
    insights.push(`Congratulations! You earned ${earnedThisMonthCount} achievement badge${earnedThisMonthCount > 1 ? "s" : ""} in the last 30 days.`);
  } else {
    insights.push("Unlock new achievements in your gallery by saving and reading bookmarks consistently.");
  }

  // Completion Rate Insight
  if (totalCount > 0) {
    insights.push(`You have read ${totalRead} of your ${totalCount} saved bookmarks (${readPercentage}% completion rate).`);
  }

  const summary: ProductivitySummary = {
    readingStats,
    streaks,
    tagProgressList,
    activeGoals,
    recentBadges,
    allBadges,
    insights,
    generatedAt: new Date().toISOString(),
  };

  setCachedProductivity(userId, summary);
  return summary;
}
