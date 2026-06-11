import mongoose, { Document, Schema } from "mongoose";

export interface IAchievement extends Document {
  userId: mongoose.Types.ObjectId;
  badgeCode: string;
  earnedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    badgeCode: {
      type: String,
      required: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound unique index so users cannot earn the same badge multiple times
AchievementSchema.index({ userId: 1, badgeCode: 1 }, { unique: true });
AchievementSchema.index({ userId: 1, earnedAt: -1 });

export default mongoose.models.Achievement ||
  mongoose.model<IAchievement>("Achievement", AchievementSchema);
