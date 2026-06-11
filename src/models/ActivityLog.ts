import mongoose, { Document, Schema } from "mongoose";

export type ActivityAction =
  | "bookmark_created"
  | "bookmark_updated"
  | "bookmark_deleted"
  | "favorite_added"
  | "favorite_removed"
  | "readlater_added"
  | "readlater_removed"
  | "folder_changed"
  | "tags_updated"
  | "summary_updated"
  | "version_restored"
  | "bookmark_restored"
  | "bookmark_read"
  | "bookmark_unread";

export interface ActivityMetadata {
  bookmarkTitle?: string;
  bookmarkUrl?: string;
  versionNumber?: number;
  fromFolder?: string | null;
  toFolder?: string | null;
  fromTags?: string[];
  toTags?: string[];
  restoredVersionNumber?: number;
}

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  bookmarkId: mongoose.Types.ObjectId | null;
  action: ActivityAction;
  metadata: ActivityMetadata;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookmarkId: {
      type: Schema.Types.ObjectId,
      ref: "Bookmark",
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "bookmark_created",
        "bookmark_updated",
        "bookmark_deleted",
        "favorite_added",
        "favorite_removed",
        "readlater_added",
        "readlater_removed",
        "folder_changed",
        "tags_updated",
        "summary_updated",
        "version_restored",
        "bookmark_restored",
        "bookmark_read",
        "bookmark_unread",
      ],
    },
    metadata: {
      bookmarkTitle: { type: String },
      bookmarkUrl: { type: String },
      versionNumber: { type: Number },
      fromFolder: { type: String, default: null },
      toFolder: { type: String, default: null },
      fromTags: [{ type: String }],
      toTags: [{ type: String }],
      restoredVersionNumber: { type: Number },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Index for paginated activity feeds
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, bookmarkId: 1, createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
