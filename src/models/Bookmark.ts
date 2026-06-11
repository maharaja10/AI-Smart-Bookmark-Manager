import mongoose, { Document, Schema } from 'mongoose';

export interface IBookmark extends Document {
  _id: string;
  title: string;
  url: string;
  description?: string;
  summary?: string;
  tags: string[];
  folderId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  favicon?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  isFavorite: boolean;
  isReadLater: boolean;
  isRead: boolean;
  readAt?: Date | null;
  isPublic: boolean;
  publicId?: string;
  visitCount: number;
  lastVisited?: Date;
  sortOrder: number;
  aiFolderSuggestion?: string;
  aiFolderConfidence?: number;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>({
  title: {
    type: String,
    required: [true, 'Bookmark title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
    match: [
      /^https?:\/\/.+/,
      'Please enter a valid URL starting with http:// or https://',
    ],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters'],
  },
  summary: {
    type: String,
    default: '',
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot be more than 50 characters'],
  }],
  folderId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  favicon: {
    type: String,
    default: '',
  },
  ogImage: {
    type: String,
    default: '',
  },
  ogTitle: {
    type: String,
    default: '',
  },
  ogDescription: {
    type: String,
    default: '',
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  isReadLater: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  publicId: {
    type: String,
    unique: true,
    sparse: true,
  },
  visitCount: {
    type: Number,
    default: 0,
  },
  lastVisited: {
    type: Date,
    default: null,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  aiFolderSuggestion: {
    type: String,
    default: null,
  },
  aiFolderConfidence: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
BookmarkSchema.index({ userId: 1, createdAt: -1 });
BookmarkSchema.index({ userId: 1, updatedAt: -1 });
BookmarkSchema.index({ userId: 1, lastVisited: -1 });
BookmarkSchema.index({ userId: 1, folderId: 1 });
BookmarkSchema.index({ userId: 1, tags: 1 });
BookmarkSchema.index({ userId: 1, isFavorite: 1 });
BookmarkSchema.index({ userId: 1, isReadLater: 1 });
BookmarkSchema.index({ userId: 1, isRead: 1 });
BookmarkSchema.index({ url: 1, userId: 1 }, { unique: true });
// Text index for full-text search (title weighted highest)
BookmarkSchema.index(
  { title: "text", description: "text", summary: "text", tags: "text" },
  { weights: { title: 10, tags: 5, description: 3, summary: 2 }, name: "bookmark_text_search" }
);

export default mongoose.models.Bookmark || mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
