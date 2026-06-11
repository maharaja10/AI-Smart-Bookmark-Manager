"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, RotateCcw, Calendar, Check, AlertCircle, FileText, ExternalLink, Hash, FolderClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface VersionSnapshot {
  title: string;
  url: string;
  description: string;
  summary: string;
  tags: string[];
  folderId: string | null;
  isFavorite: boolean;
  isReadLater: boolean;
}

interface Version {
  _id: string;
  bookmarkId: string;
  userId: string;
  versionNumber: number;
  changeType: string;
  snapshot: VersionSnapshot;
  createdAt: string;
}

interface VersionHistoryProps {
  bookmarkId: string;
  isDeletedInitially?: boolean;
}

const CHANGE_LABELS: Record<string, string> = {
  bookmark_created: "Created Bookmark",
  bookmark_updated: "Updated Content",
  tags_updated: "Updated Tags",
  summary_updated: "Updated AI Summary",
  folder_changed: "Changed Folder",
  favorite_added: "Added to Favorites",
  favorite_removed: "Removed from Favorites",
  readlater_added: "Added to Read Later",
  readlater_removed: "Removed from Read Later",
  bookmark_restored: "Restored to Previous Version",
};

export default function VersionHistory({ bookmarkId, isDeletedInitially = false }: VersionHistoryProps) {
  const router = useRouter();
  const [versions, setVersions] = useState<Version[]>([]);
  const [isDeleted, setIsDeleted] = useState(isDeletedInitially);
  const [deletedAt, setDeletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showAllFields, setShowAllFields] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookmarks/${bookmarkId}/history`);
      if (!res.ok) {
        throw new Error("Failed to fetch version history");
      }
      const data = await res.json();
      setVersions(data.versions || []);
      setIsDeleted(data.isDeleted || false);
      if (data.isDeleted) {
        setDeletedAt(data.deletedAt);
      }
    } catch (error) {
      toast.error("Failed to load version history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [bookmarkId]);

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (isDeleted) {
      toast.error("Deleted bookmarks cannot be restored.");
      return;
    }

    if (!confirm(`Are you sure you want to restore to Version ${versionNumber}?`)) {
      return;
    }

    setRestoringId(versionId);
    try {
      const res = await fetch(`/api/bookmarks/${bookmarkId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to restore version");
      }

      toast.success(`Successfully restored to Version ${versionNumber}`);
      fetchHistory(); // Refresh history timeline
      router.refresh(); // Refresh Server Components
    } catch (error: any) {
      toast.error(error.message || "Failed to restore version");
    } finally {
      setRestoringId(null);
    }
  };

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        // Replace the oldest selection
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Find the selected version objects
  const vLeft = versions.find((v) => v._id === selectedVersions[0]);
  const vRight = versions.find((v) => v._id === selectedVersions[1]);

  // Sort selected versions by version number so before/after comparison makes chronological sense
  let beforeVersion: Version | undefined = undefined;
  let afterVersion: Version | undefined = undefined;

  if (vLeft && vRight) {
    if (vLeft.versionNumber < vRight.versionNumber) {
      beforeVersion = vLeft;
      afterVersion = vRight;
    } else {
      beforeVersion = vRight;
      afterVersion = vLeft;
    }
  } else if (vLeft) {
    // If only one is selected, compare with its predecessor if exists
    const index = versions.findIndex((v) => v._id === vLeft._id);
    afterVersion = vLeft;
    if (index < versions.length - 1) {
      beforeVersion = versions[index + 1]; // items are sorted desc, so predecessor is at index + 1
    }
  }

  const getDiffs = (before: VersionSnapshot | undefined, after: VersionSnapshot) => {
    const fields = [
      { key: "title", label: "Title", type: "text" },
      { key: "url", label: "URL", type: "link" },
      { key: "description", label: "Description", type: "text" },
      { key: "summary", label: "Summary", type: "text" },
      { key: "tags", label: "Tags", type: "tags" },
      { key: "folderId", label: "Folder ID", type: "text" },
      { key: "isFavorite", label: "Favorite", type: "boolean" },
      { key: "isReadLater", label: "Read Later", type: "boolean" },
    ];

    return fields.map((field) => {
      const bVal = before ? before[field.key as keyof VersionSnapshot] : null;
      const aVal = after[field.key as keyof VersionSnapshot];
      const hasChanged = JSON.stringify(bVal) !== JSON.stringify(aVal);

      return {
        key: field.key,
        label: field.label,
        type: field.type,
        beforeValue: bVal,
        afterValue: aVal,
        changed: before ? hasChanged : true,
      };
    });
  };

  const diffItems = afterVersion ? getDiffs(beforeVersion?.snapshot, afterVersion.snapshot) : [];
  const filteredDiffItems = showAllFields ? diffItems : diffItems.filter((item) => item.changed);

  return (
    <div className="space-y-6">
      {isDeleted && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive-foreground dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">Deleted Bookmark</h4>
            <p className="text-sm opacity-90">
              This bookmark was deleted at {deletedAt ? formatDate(deletedAt) : "unknown time"}. Its version history is preserved below in read-only mode.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Version List */}
        <div className={versions.length > 0 && afterVersion ? "lg:col-span-5" : "lg:col-span-12"}>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Version History</h3>
              <span className="text-xs text-muted-foreground">Select two to compare</span>
            </div>

            <div className="divide-y max-h-[500px] overflow-y-auto pr-1">
              {versions.map((v) => {
                const isSelected = selectedVersions.includes(v._id);
                const isCurrent = !isDeleted && v.versionNumber === versions[0].versionNumber;
                return (
                  <div
                    key={v._id}
                    className={`flex items-start justify-between py-3 transition-colors ${
                      isSelected ? "bg-accent/40 px-2 rounded-md" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectVersion(v._id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            Version {v.versionNumber}
                          </span>
                          {isCurrent && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {CHANGE_LABELS[v.changeType] || v.changeType}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(v.createdAt)}
                        </p>
                      </div>
                    </div>

                    {!isDeleted && !isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={restoringId !== null}
                        onClick={() => handleRestore(v._id, v.versionNumber)}
                        className="h-8 gap-1 text-xs hover:bg-primary/10 hover:text-primary"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Diff Comparison Panel */}
        {afterVersion && (
          <div className="lg:col-span-7">
            <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">
                    Comparing {beforeVersion ? `V${beforeVersion.versionNumber} vs V${afterVersion.versionNumber}` : `V${afterVersion.versionNumber} (Initial)`}
                  </h3>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAllFields}
                    onChange={(e) => setShowAllFields(e.target.checked)}
                    className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Show unchanged fields
                </label>
              </div>

              {filteredDiffItems.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                  <Check className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-sm">No changes detected between these versions.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {filteredDiffItems.map((item) => {
                    const hasBefore = beforeVersion !== undefined;
                    return (
                      <div key={item.key} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {item.key === "tags" && <Hash className="h-3 w-3" />}
                          {item.key === "folderId" && <FolderClosed className="h-3 w-3" />}
                          {item.key === "url" && <ExternalLink className="h-3 w-3" />}
                          {item.key !== "tags" && item.key !== "folderId" && item.key !== "url" && <FileText className="h-3 w-3" />}
                          {item.label}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {/* Before value (Red) */}
                          <div className={`rounded p-2 text-sm ${item.changed ? "bg-rose-50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-300 line-through decoration-rose-500/50" : "bg-muted text-muted-foreground"}`}>
                            {!hasBefore ? (
                              <span className="italic text-xs opacity-50">Empty</span>
                            ) : item.type === "tags" ? (
                              <div className="flex flex-wrap gap-1">
                                {Array.isArray(item.beforeValue) && item.beforeValue.length > 0 ? (
                                  (item.beforeValue as string[]).map((t) => (
                                    <span key={t} className="rounded bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 text-xs">
                                      {t}
                                    </span>
                                  ))
                                ) : (
                                  <span className="italic text-xs opacity-50">No tags</span>
                                )}
                              </div>
                            ) : item.type === "boolean" ? (
                              <span>{item.beforeValue ? "Active" : "Inactive"}</span>
                            ) : item.beforeValue ? (
                              <span>{String(item.beforeValue)}</span>
                            ) : (
                              <span className="italic text-xs opacity-50">Empty</span>
                            )}
                          </div>

                          {/* After value (Green) */}
                          <div className={`rounded p-2 text-sm ${item.changed ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-300 font-medium" : "bg-muted text-muted-foreground"}`}>
                            {item.type === "tags" ? (
                              <div className="flex flex-wrap gap-1">
                                {Array.isArray(item.afterValue) && (item.afterValue as string[]).length > 0 ? (
                                  (item.afterValue as string[]).map((t) => (
                                    <span key={t} className="rounded bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-xs">
                                      {t}
                                    </span>
                                  ))
                                ) : (
                                  <span className="italic text-xs opacity-50">No tags</span>
                                )}
                              </div>
                            ) : item.type === "boolean" ? (
                              <span>{item.afterValue ? "Active" : "Inactive"}</span>
                            ) : item.afterValue ? (
                              item.type === "link" ? (
                                <a href={String(item.afterValue)} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 text-primary">
                                  {String(item.afterValue)}
                                </a>
                              ) : (
                                <span>{String(item.afterValue)}</span>
                              )
                            ) : (
                              <span className="italic text-xs opacity-50">Empty</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
