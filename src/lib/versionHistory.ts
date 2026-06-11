import mongoose from "mongoose";
import BookmarkVersion, {
  ChangeType,
  VersionSnapshot,
  IBookmarkVersion,
} from "@/models/BookmarkVersion";
import ActivityLog, {
  ActivityAction,
  ActivityMetadata,
  IActivityLog,
} from "@/models/ActivityLog";

// ─── Types (re-exported for API consumers) ────────────────────────────────────

export type { ChangeType, VersionSnapshot, ActivityAction, ActivityMetadata };

export interface SerializedVersion {
  _id: string;
  bookmarkId: string;
  userId: string;
  versionNumber: number;
  changeType: ChangeType;
  snapshot: VersionSnapshot;
  createdAt: string;
}

export interface FieldDiff {
  field: string;
  label: string;
  before: string | string[] | boolean | null;
  after: string | string[] | boolean | null;
  changed: boolean;
}

export interface VersionDiff {
  versionNumber: number;
  changeType: ChangeType;
  createdAt: string;
  diffs: FieldDiff[];
}

export interface SerializedActivity {
  _id: string;
  userId: string;
  bookmarkId: string | null;
  action: ActivityAction;
  metadata: ActivityMetadata;
  createdAt: string;
}

export interface ActivityFeedPage {
  activities: SerializedActivity[];
  total: number;
  page: number;
  pages: number;
}

// ─── Activity Cache (15-minute TTL) ──────────────────────────────────────────

interface FeedCacheEntry {
  activities: SerializedActivity[];
  total: number;
  expiresAt: number;
}

const activityCache = new Map<string, FeedCacheEntry>();
const ACTIVITY_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCachedFeed(cacheKey: string): { activities: SerializedActivity[]; total: number } | null {
  const entry = activityCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    activityCache.delete(cacheKey);
    return null;
  }
  return { activities: entry.activities, total: entry.total };
}

function setCachedFeed(
  cacheKey: string,
  activities: SerializedActivity[],
  total: number
): void {
  activityCache.set(cacheKey, {
    activities,
    total,
    expiresAt: Date.now() + ACTIVITY_CACHE_TTL_MS,
  });
}

export function invalidateActivityCache(userId: string): void {
  // Remove all entries whose key starts with userId
  for (const key of activityCache.keys()) {
    if (key.startsWith(userId)) activityCache.delete(key);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeVersion(v: IBookmarkVersion): SerializedVersion {
  return {
    _id: String(v._id),
    bookmarkId: String(v.bookmarkId),
    userId: String(v.userId),
    versionNumber: v.versionNumber,
    changeType: v.changeType,
    snapshot: v.snapshot,
    createdAt: v.createdAt.toISOString(),
  };
}

function serializeActivity(a: IActivityLog): SerializedActivity {
  return {
    _id: String(a._id),
    userId: String(a.userId),
    bookmarkId: a.bookmarkId ? String(a.bookmarkId) : null,
    action: a.action,
    metadata: a.metadata,
    createdAt: a.createdAt.toISOString(),
  };
}

// ─── Version History ──────────────────────────────────────────────────────────

/**
 * Build a version snapshot from a raw bookmark document.
 */
export function buildSnapshot(raw: {
  title?: string;
  url?: string;
  description?: string;
  summary?: string;
  tags?: string[];
  folderId?: mongoose.Types.ObjectId | string | null;
  isFavorite?: boolean;
  isReadLater?: boolean;
}): VersionSnapshot {
  return {
    title: raw.title ?? "",
    url: raw.url ?? "",
    description: raw.description ?? "",
    summary: raw.summary ?? "",
    tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
    folderId: raw.folderId ? String(raw.folderId) : null,
    isFavorite: Boolean(raw.isFavorite),
    isReadLater: Boolean(raw.isReadLater),
  };
}

/**
 * Determine the change type by comparing old and new snapshots.
 * Falls back to bookmark_updated for general changes.
 */
export function detectChangeType(
  before: VersionSnapshot,
  after: VersionSnapshot
): ChangeType {
  if (before.isFavorite !== after.isFavorite) {
    return after.isFavorite ? "favorite_added" : "favorite_removed";
  }
  if (before.isReadLater !== after.isReadLater) {
    return after.isReadLater ? "readlater_added" : "readlater_removed";
  }
  if (before.folderId !== after.folderId) {
    return "folder_changed";
  }
  if (JSON.stringify(before.tags) !== JSON.stringify(after.tags)) {
    return "tags_updated";
  }
  if (before.summary !== after.summary) {
    return "summary_updated";
  }
  return "bookmark_updated";
}

/**
 * Create a new version snapshot for a bookmark.
 * Atomically determines the next version number.
 */
export async function createVersion(
  bookmarkId: string,
  userId: string,
  snapshot: VersionSnapshot,
  changeType: ChangeType
): Promise<SerializedVersion> {
  // Find the current highest version number for this bookmark
  const latest = await BookmarkVersion.findOne({ bookmarkId })
    .sort({ versionNumber: -1 })
    .select("versionNumber")
    .lean() as { versionNumber: number } | null;

  const nextVersion = (latest?.versionNumber ?? 0) + 1;

  const version = await BookmarkVersion.create({
    bookmarkId: new mongoose.Types.ObjectId(bookmarkId),
    userId: new mongoose.Types.ObjectId(userId),
    versionNumber: nextVersion,
    changeType,
    snapshot,
  });

  return serializeVersion(version);
}

/**
 * Get full version history for a bookmark.
 */
export async function getVersionHistory(
  bookmarkId: string,
  userId: string
): Promise<SerializedVersion[]> {
  const versions = await BookmarkVersion.find({ bookmarkId, userId })
    .sort({ versionNumber: -1 })
    .lean() as unknown as IBookmarkVersion[];

  return versions.map(serializeVersion);
}

/**
 * Restore a bookmark to a specific version snapshot.
 * Creates a new version entry marking the restore and a new activity log.
 * Returns the restored snapshot.
 */
export async function restoreVersion(
  bookmarkId: string,
  userId: string,
  versionId: string
): Promise<{ snapshot: VersionSnapshot; newVersion: SerializedVersion }> {
  const targetVersion = await BookmarkVersion.findOne({
    _id: versionId,
    bookmarkId,
    userId,
  }).lean() as unknown as IBookmarkVersion | null;

  if (!targetVersion) {
    throw new Error("Version not found or unauthorized.");
  }

  // Create a new snapshot that records the restore
  const restoredVersion = await createVersion(
    bookmarkId,
    userId,
    targetVersion.snapshot,
    "bookmark_restored"
  );

  // Log the activity (fire-and-forget is fine for logging)
  await createActivity(userId, bookmarkId, "bookmark_restored", {
    bookmarkTitle: targetVersion.snapshot.title,
    bookmarkUrl: targetVersion.snapshot.url,
    restoredVersionNumber: targetVersion.versionNumber,
  });

  return { snapshot: targetVersion.snapshot, newVersion: restoredVersion };
}

/**
 * Generate a diff between two version snapshots.
 */
export function generateDiff(
  before: VersionSnapshot,
  after: VersionSnapshot
): FieldDiff[] {
  const fields: Array<{
    key: keyof VersionSnapshot;
    label: string;
  }> = [
    { key: "title", label: "Title" },
    { key: "url", label: "URL" },
    { key: "description", label: "Description" },
    { key: "summary", label: "Summary" },
    { key: "tags", label: "Tags" },
    { key: "folderId", label: "Folder" },
    { key: "isFavorite", label: "Favorite" },
    { key: "isReadLater", label: "Read Later" },
  ];

  return fields.map(({ key, label }) => {
    const beforeVal = before[key] ?? null;
    const afterVal = after[key] ?? null;
    const changed =
      JSON.stringify(beforeVal) !== JSON.stringify(afterVal);

    return {
      field: key,
      label,
      before: beforeVal as string | string[] | boolean | null,
      after: afterVal as string | string[] | boolean | null,
      changed,
    };
  });
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

/**
 * Create an activity log entry and invalidate the feed cache.
 */
export async function createActivity(
  userId: string,
  bookmarkId: string | null,
  action: ActivityAction,
  metadata: ActivityMetadata = {}
): Promise<void> {
  await ActivityLog.create({
    userId: new mongoose.Types.ObjectId(userId),
    bookmarkId: bookmarkId ? new mongoose.Types.ObjectId(bookmarkId) : null,
    action,
    metadata,
  });
  // Invalidate cache so next request gets fresh data
  invalidateActivityCache(userId);
}

/**
 * Get a paginated activity feed for a user.
 * Results cached for 15 minutes per userId+page+limit combination.
 */
export async function getActivityFeed(
  userId: string,
  page = 1,
  limit = 50
): Promise<ActivityFeedPage> {
  const cacheKey = `${userId}:${page}:${limit}`;
  const cached = getCachedFeed(cacheKey);

  if (cached) {
    return {
      activities: cached.activities,
      total: cached.total,
      page,
      pages: Math.ceil(cached.total / limit),
    };
  }

  const skip = (page - 1) * limit;

  const [rawActivities, total] = await Promise.all([
    ActivityLog.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() as unknown as Promise<IActivityLog[]>,
    ActivityLog.countDocuments({ userId }),
  ]);

  const activities = rawActivities.map(serializeActivity);

  setCachedFeed(cacheKey, activities, total);

  return {
    activities,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}
