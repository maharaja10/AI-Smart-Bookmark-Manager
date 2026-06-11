"use client";

import { Award, Bookmark, BookOpen, Heart, Flame, Trophy, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface BadgeInfo {
  badgeCode: string;
  earned: boolean;
  earnedAt: string | null;
  name: string;
  description: string;
}

interface AchievementGalleryProps {
  badges: BadgeInfo[];
}

const BADGE_ICONS: Record<string, any> = {
  FIRST_BOOKMARK: Bookmark,
  "10_BOOKMARKS": Bookmark,
  "50_BOOKMARKS": Bookmark,
  "100_BOOKMARKS": Bookmark,
  FIRST_READ: BookOpen,
  "10_READS": BookOpen,
  "50_READS": BookOpen,
  FIRST_FAVORITE: Heart,
  "10_FAVORITES": Heart,
  STREAK_7: Flame,
  STREAK_30: Flame,
  PRODUCTIVITY_MASTER: Trophy,
};

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FIRST_BOOKMARK: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-500", border: "border-blue-200 dark:border-blue-900/50" },
  "10_BOOKMARKS": { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-500", border: "border-blue-200 dark:border-blue-900/50" },
  "50_BOOKMARKS": { bg: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-500", border: "border-indigo-200 dark:border-indigo-900/50" },
  "100_BOOKMARKS": { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-500", border: "border-purple-200 dark:border-purple-900/50" },
  FIRST_READ: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-500", border: "border-emerald-200 dark:border-emerald-900/50" },
  "10_READS": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-500", border: "border-emerald-200 dark:border-emerald-900/50" },
  "50_READS": { bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-500", border: "border-teal-200 dark:border-teal-900/50" },
  FIRST_FAVORITE: { bg: "bg-pink-50 dark:bg-pink-950/30", text: "text-pink-500", border: "border-pink-200 dark:border-pink-900/50" },
  "10_FAVORITES": { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-500", border: "border-rose-200 dark:border-rose-900/50" },
  STREAK_7: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-500", border: "border-amber-200 dark:border-amber-900/50" },
  STREAK_30: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-500", border: "border-orange-200 dark:border-orange-900/50" },
  PRODUCTIVITY_MASTER: { bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-900/50" },
};

export default function AchievementGallery({ badges }: AchievementGalleryProps) {
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Achievements & Badges
        </h2>
        <span className="text-sm font-semibold text-muted-foreground">
          {earnedCount} / {badges.length} Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {badges.map((badge) => {
          const IconComponent = BADGE_ICONS[badge.badgeCode] || Award;
          const colors = BADGE_COLORS[badge.badgeCode] || {
            bg: "bg-muted",
            text: "text-muted-foreground",
            border: "border-border",
          };

          return (
            <div
              key={badge.badgeCode}
              className={`flex items-start gap-3 rounded-lg border p-4 transition-all relative ${
                badge.earned
                  ? `bg-card ${colors.border} hover:shadow-md`
                  : "bg-muted/30 border-dashed border-border/60 grayscale opacity-60"
              }`}
            >
              {/* Lock Icon Overlay for Locked Badges */}
              {!badge.earned && (
                <div className="absolute right-3 top-3 text-muted-foreground/60" title="Locked">
                  <Lock className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border shadow-sm ${
                  badge.earned
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                <IconComponent className="h-5 w-5" />
              </div>

              <div className="min-w-0 pr-4">
                <h4 className="font-semibold text-sm text-foreground leading-snug truncate">
                  {badge.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                  {badge.description}
                </p>
                {badge.earned && badge.earnedAt && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Unlocked {formatDate(badge.earnedAt)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
