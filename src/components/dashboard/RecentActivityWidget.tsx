"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Edit3, Trash2, Heart, Clock, FolderInput, Tags, Sparkles, RotateCcw, ArrowRight, History } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Activity {
  _id: string;
  action: string;
  bookmarkId: string | null;
  metadata: {
    bookmarkTitle?: string;
    bookmarkUrl?: string;
    fromFolder?: string | null;
    toFolder?: string | null;
    fromTags?: string[];
    toTags?: string[];
    restoredVersionNumber?: number;
  };
  createdAt: string;
}

const ACTION_CONFIGS: Record<
  string,
  { label: string; icon: any; colorClass: string; bgClass: string }
> = {
  bookmark_created: {
    label: "Created bookmark",
    icon: PlusCircle,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  bookmark_updated: {
    label: "Updated bookmark",
    icon: Edit3,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950/20",
  },
  bookmark_deleted: {
    label: "Deleted bookmark",
    icon: Trash2,
    colorClass: "text-rose-500",
    bgClass: "bg-rose-50 dark:bg-rose-950/20",
  },
  favorite_added: {
    label: "Favorited",
    icon: Heart,
    colorClass: "text-pink-500",
    bgClass: "bg-pink-50 dark:bg-pink-950/20",
  },
  favorite_removed: {
    label: "Unfavorited",
    icon: Heart,
    colorClass: "text-gray-400 dark:text-gray-500",
    bgClass: "bg-gray-100 dark:bg-gray-800/40",
  },
  readlater_added: {
    label: "Added to Read Later",
    icon: Clock,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-950/20",
  },
  readlater_removed: {
    label: "Removed from Read Later",
    icon: Clock,
    colorClass: "text-gray-400 dark:text-gray-500",
    bgClass: "bg-gray-100 dark:bg-gray-800/40",
  },
  folder_changed: {
    label: "Moved folder",
    icon: FolderInput,
    colorClass: "text-indigo-500",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/20",
  },
  tags_updated: {
    label: "Updated tags",
    icon: Tags,
    colorClass: "text-cyan-500",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/20",
  },
  summary_updated: {
    label: "Updated AI summary",
    icon: Sparkles,
    colorClass: "text-purple-500",
    bgClass: "bg-purple-50 dark:bg-purple-950/20",
  },
  bookmark_restored: {
    label: "Restored rollback",
    icon: RotateCcw,
    colorClass: "text-violet-500",
    bgClass: "bg-violet-50 dark:bg-violet-950/20",
  },
};

export default function RecentActivityWidget() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const res = await fetch("/api/activity?limit=5");
        if (!res.ok) throw new Error("Failed to fetch activity");
        const data = await res.json();
        setActivities(data.activities || []);
      } catch (error) {
        console.error("Error loading recent activities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentActivity();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Recent Activity
        </h2>
        <div className="flex h-24 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Recent Activity
        </h2>
        <Link
          href="/dashboard/activity"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          View Log
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-4">
        {activities.map((act) => {
          const config = ACTION_CONFIGS[act.action] || {
            label: act.action,
            icon: History,
            colorClass: "text-muted-foreground",
            bgClass: "bg-muted",
          };
          const Icon = config.icon;

          return (
            <div key={act._id} className="flex items-start gap-3 text-sm">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bgClass} ${config.colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">
                  {config.label}
                </p>
                <p className="font-medium text-foreground truncate mt-0.5">
                  {act.bookmarkId ? (
                    <Link
                      href={`/dashboard/bookmarks/${act.bookmarkId}`}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {act.metadata.bookmarkTitle || "View Bookmark"}
                    </Link>
                  ) : (
                    <span className="line-through decoration-rose-500/30">
                      {act.metadata.bookmarkTitle || "Deleted Bookmark"}
                    </span>
                  )}
                </p>

                {/* Event specific details */}
                {act.action === "folder_changed" && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Moved: {act.metadata.fromFolder || "Unassigned"} → {act.metadata.toFolder || "Unassigned"}
                  </p>
                )}
                {act.action === "bookmark_restored" && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Rolled back to Version {act.metadata.restoredVersionNumber}
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDate(act.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
