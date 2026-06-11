"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Edit3, Trash2, Heart, Clock, FolderInput, Tags, Sparkles, RotateCcw, Calendar, History, ArrowLeft, ArrowRight, ChevronRight, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    label: "Created Bookmark",
    icon: PlusCircle,
    colorClass: "text-emerald-500 border-emerald-200 dark:border-emerald-900/50",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  bookmark_updated: {
    label: "Updated Content",
    icon: Edit3,
    colorClass: "text-amber-500 border-amber-200 dark:border-amber-900/50",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
  },
  bookmark_deleted: {
    label: "Deleted Bookmark",
    icon: Trash2,
    colorClass: "text-rose-500 border-rose-200 dark:border-rose-900/50",
    bgClass: "bg-rose-50 dark:bg-rose-950/30",
  },
  favorite_added: {
    label: "Added to Favorites",
    icon: Heart,
    colorClass: "text-pink-500 border-pink-200 dark:border-pink-900/50",
    bgClass: "bg-pink-50 dark:bg-pink-950/30",
  },
  favorite_removed: {
    label: "Removed from Favorites",
    icon: Heart,
    colorClass: "text-gray-400 border-gray-200 dark:border-gray-800 dark:text-gray-500",
    bgClass: "bg-gray-100 dark:bg-gray-800/40",
  },
  readlater_added: {
    label: "Added to Read Later",
    icon: Clock,
    colorClass: "text-blue-500 border-blue-200 dark:border-blue-900/50",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
  },
  readlater_removed: {
    label: "Removed from Read Later",
    icon: Clock,
    colorClass: "text-gray-400 border-gray-200 dark:border-gray-800 dark:text-gray-500",
    bgClass: "bg-gray-100 dark:bg-gray-800/40",
  },
  folder_changed: {
    label: "Changed Folder",
    icon: FolderInput,
    colorClass: "text-indigo-500 border-indigo-200 dark:border-indigo-900/50",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  tags_updated: {
    label: "Updated Tags",
    icon: Tags,
    colorClass: "text-cyan-500 border-cyan-200 dark:border-cyan-900/50",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  summary_updated: {
    label: "Updated AI Summary",
    icon: Sparkles,
    colorClass: "text-purple-500 border-purple-200 dark:border-purple-900/50",
    bgClass: "bg-purple-50 dark:bg-purple-950/30",
  },
  bookmark_restored: {
    label: "Restored Version",
    icon: RotateCcw,
    colorClass: "text-violet-500 border-violet-200 dark:border-violet-900/50",
    bgClass: "bg-violet-50 dark:bg-violet-950/30",
  },
};

export default function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchActivities = async (pageNumber: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity?page=${pageNumber}&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      const data = await res.json();
      setActivities(data.activities || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalItems(data.pagination?.total || 0);
    } catch (error) {
      console.error("Error loading activity timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(page);
  }, [page]);

  const groupActivitiesByDate = (items: Activity[]) => {
    const groups: Record<string, Activity[]> = {
      Today: [],
      Yesterday: [],
      "Last 7 Days": [],
      Older: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    items.forEach((item) => {
      const actDate = new Date(item.createdAt);
      const actDay = new Date(actDate);
      actDay.setHours(0, 0, 0, 0);

      if (actDay.getTime() === today.getTime()) {
        groups["Today"].push(item);
      } else if (actDay.getTime() === yesterday.getTime()) {
        groups["Yesterday"].push(item);
      } else if (actDay.getTime() >= sevenDaysAgo.getTime()) {
        groups["Last 7 Days"].push(item);
      } else {
        groups["Older"].push(item);
      }
    });

    return Object.entries(groups).filter(([_, groupedItems]) => groupedItems.length > 0);
  };

  const groupedTimeline = groupActivitiesByDate(activities);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tracking actions, modifications, and rollbacks ({totalItems} events recorded)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center bg-card shadow-sm">
          <History className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-lg">No Activity Logged</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Start saving or modifying your bookmarks to see your timeline build.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedTimeline.map(([groupName, groupItems]) => (
            <div key={groupName} className="space-y-4">
              {/* Timeline Section Title */}
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                {groupName}
              </h3>

              {/* Timeline Container */}
              <div className="relative border-l border-border ml-4 pl-6 space-y-6">
                {groupItems.map((act) => {
                  const config = ACTION_CONFIGS[act.action] || {
                    label: act.action,
                    icon: History,
                    colorClass: "text-muted-foreground border-muted-200",
                    bgClass: "bg-muted",
                  };
                  const Icon = config.icon;

                  return (
                    <div
                      key={act._id}
                      className="group relative flex flex-col gap-1 rounded-lg border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                    >
                      {/* Connector dot with icon */}
                      <span className={`absolute -left-[37px] top-[14px] flex h-6 w-6 items-center justify-center rounded-full border bg-card text-[10px] shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground ${config.colorClass}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>

                      {/* Header line */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          {config.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(act.createdAt)}
                        </span>
                      </div>

                      {/* Content block */}
                      <h4 className="font-medium text-foreground text-sm mt-1">
                        {act.bookmarkId ? (
                          <Link
                            href={`/dashboard/bookmarks/${act.bookmarkId}`}
                            className="hover:underline hover:text-primary transition-colors flex items-center gap-1"
                          >
                            {act.metadata.bookmarkTitle || "View Bookmark"}
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <span className="line-through decoration-rose-500/30 text-muted-foreground">
                            {act.metadata.bookmarkTitle || "Deleted Bookmark"}
                          </span>
                        )}
                      </h4>

                      {act.metadata.bookmarkUrl && (
                        <p className="text-xs text-muted-foreground truncate max-w-xl">
                          {act.metadata.bookmarkUrl}
                        </p>
                      )}

                      {/* Hoverable details container */}
                      <div className="mt-2 text-xs border-t pt-2 opacity-60 group-hover:opacity-100 transition-opacity space-y-1 bg-muted/30 p-2 rounded-md border border-dashed">
                        {act.action === "folder_changed" && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">Move Folder:</span>
                            <span className="text-rose-600 dark:text-rose-400 line-through">
                              {act.metadata.fromFolder || "Unassigned"}
                            </span>
                            <span className="mx-1">→</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {act.metadata.toFolder || "Unassigned"}
                            </span>
                          </div>
                        )}

                        {act.action === "tags_updated" && (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-semibold">Tags Before:</span>
                              {act.metadata.fromTags && act.metadata.fromTags.length > 0 ? (
                                act.metadata.fromTags.map((t) => (
                                  <span key={t} className="rounded bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 px-1 py-0.2 text-[10px]">
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="italic opacity-50">None</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-semibold">Tags After:</span>
                              {act.metadata.toTags && act.metadata.toTags.length > 0 ? (
                                act.metadata.toTags.map((t) => (
                                  <span key={t} className="rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-1 py-0.2 text-[10px]">
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="italic opacity-50">None</span>
                              )}
                            </div>
                          </div>
                        )}

                        {act.action === "bookmark_restored" && (
                          <div>
                            Rolled back history state successfully to{" "}
                            <span className="font-bold text-primary">Version {act.metadata.restoredVersionNumber}</span>
                          </div>
                        )}

                        {act.action !== "folder_changed" && act.action !== "tags_updated" && act.action !== "bookmark_restored" && (
                          <div>
                            No property adjustments detected. Audit trail state saved.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="flex items-center justify-center px-4 text-sm font-medium">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
