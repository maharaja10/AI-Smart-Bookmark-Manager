import mongoose, { Document, Schema } from "mongoose";

export type ChangeType =
  | "bookmark_created"
  | "bookmark_updated"
  | "tags_updated"
  | "summary_updated"
  | "folder_changed"
  | "favorite_added"
  | "favorite_removed"
  | "readlater_added"
  | "readlater_removed"
  | "version_restored"
  | "bookmark_restored";

export interface VersionSnapshot {
  title: string;
  url: string;
  description: string;
  summary: string;
  tags: string[];
  folderId: string | null;
  isFavorite: boolean;
  isReadLater: boolean;
}

export interface IBookmarkVersion extends Document {
  bookmarkId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  versionNumber: number;
  changeType: ChangeType;
  snapshot: VersionSnapshot;
  createdAt: Date;
}

const VersionSnapshotSchema = new Schema<VersionSnapshot>(
  {
    title: { type: String, default: "" },
    url: { type: String, default: "" },
    description: { type: String, default: "" },
    summary: { type: String, default: "" },
    tags: [{ type: String }],
    folderId: { type: String, default: null },
    isFavorite: { type: Boolean, default: false },
    isReadLater: { type: Boolean, default: false },
  },
  { _id: false }
);

const BookmarkVersionSchema = new Schema<IBookmarkVersion>(
  {
    bookmarkId: {
      type: Schema.Types.ObjectId,
      ref: "Bookmark",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    versionNumber: { type: Number, required: true },
    changeType: {
      type: String,
      required: true,
      enum: [
        "bookmark_created",
        "bookmark_updated",
        "tags_updated",
        "summary_updated",
        "folder_changed",
        "favorite_added",
        "favorite_removed",
        "readlater_added",
        "readlater_removed",
        "version_restored",
        "bookmark_restored",
      ],
    },
    snapshot: { type: VersionSnapshotSchema, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for efficient history lookups
BookmarkVersionSchema.index({ bookmarkId: 1, versionNumber: -1 });
BookmarkVersionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.BookmarkVersion ||
  mongoose.model<IBookmarkVersion>("BookmarkVersion", BookmarkVersionSchema);
