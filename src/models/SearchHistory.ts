import mongoose, { Document, Schema } from "mongoose";

export interface ISearchHistory extends Document {
  userId: mongoose.Types.ObjectId;
  query: string;
  searchedAt: Date;
}

const SearchHistorySchema = new Schema<ISearchHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  searchedAt: {
    type: Date,
    default: () => new Date(),
  },
});

// Efficient retrieval: per-user, most recent first
SearchHistorySchema.index({ userId: 1, searchedAt: -1 });
// TTL index — auto-expire entries older than 90 days
SearchHistorySchema.index({ searchedAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.models.SearchHistory ||
  mongoose.model<ISearchHistory>("SearchHistory", SearchHistorySchema);
