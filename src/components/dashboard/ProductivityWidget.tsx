"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, Flame, Trophy, Award, CheckCircle, ArrowRight } from "lucide-react";

interface BadgeInfo {
  badgeCode: string;
  earned: boolean;
  earnedAt: string | null;
  name: string;
  description: string;
}

interface GoalProgressInfo {
  _id: string;
  percentComplete: number;
}

interface ProductivitySummary {
  readingStats: {
    readPercentage: number;
  };
  streaks: {
    currentStreak: number;
    bestStreak: number;
  };
  activeGoals: GoalProgressInfo[];
  recentBadges: BadgeInfo[];
}

export default function ProductivityWidget() {
  const [summary, setSummary] = useState<ProductivitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch("/api/productivity");
        if (!res.ok) throw new Error("Failed to fetch productivity statistics");
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error("Error loading productivity widget:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold flex items-center gap-2 border-b pb-3 mb-4">
          <Target className="h-5 w-5 text-primary" />
          Productivity Overview
        </h2>
        <div className="flex h-16 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const { streaks, activeGoals, recentBadges, readingStats } = summary;
  const latestBadge = recentBadges[0] || null;

  // Average completion of active goals
  const activeGoalsCount = activeGoals.length;
  const avgGoalProgress =
    activeGoalsCount === 0
      ? 0
      : Math.round(
          activeGoals.reduce((sum, g) => sum + g.percentComplete, 0) / activeGoalsCount
        );

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4 hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Productivity Overview
        </h2>
        <Link
          href="/dashboard/goals"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          View Details
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="rounded-lg bg-muted/30 p-3 border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Current Streak</span>
            <Flame className="h-4 w-4 text-orange-500 fill-orange-500/20" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{streaks.currentStreak}</span>
            <span className="text-xs text-muted-foreground">days</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">Best: {streaks.bestStreak} days</span>
        </div>

        {/* Active Goals */}
        <div className="rounded-lg bg-muted/30 p-3 border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Active Goals</span>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{activeGoalsCount}</span>
            <span className="text-xs text-muted-foreground">active</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">Avg Progress: {avgGoalProgress}%</span>
        </div>

        {/* Goal Completion */}
        <div className="rounded-lg bg-muted/30 p-3 border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Reading Completion</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{readingStats.readPercentage}</span>
            <span className="text-xs text-muted-foreground">% read</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${readingStats.readPercentage}%` }} />
          </div>
        </div>

        {/* Recent Badge */}
        <div className="rounded-lg bg-muted/30 p-3 border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Latest Badge</span>
            <Award className="h-4 w-4 text-yellow-500" />
          </div>
          {latestBadge ? (
            <div className="mt-2">
              <span className="text-xs font-bold text-foreground block truncate">{latestBadge.name}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">Unlocked!</span>
            </div>
          ) : (
            <div className="mt-2">
              <span className="text-xs text-muted-foreground italic">No badges earned</span>
              <span className="text-[10px] text-muted-foreground block mt-1">Start reading to earn!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
