import mongoose, { Document, Schema } from "mongoose";

export type GoalType =
  | "bookmarks_saved"
  | "bookmarks_read"
  | "favorites_added"
  | "readlater_completed"
  | "custom_learning";

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  goalType: GoalType;
  targetValue: number;
  currentValue: number;
  startDate: Date;
  endDate: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Goal title is required"],
      trim: true,
      maxlength: [200, "Goal title cannot be more than 200 characters"],
    },
    goalType: {
      type: String,
      required: true,
      enum: [
        "bookmarks_saved",
        "bookmarks_read",
        "favorites_added",
        "readlater_completed",
        "custom_learning",
      ],
    },
    targetValue: {
      type: Number,
      required: [true, "Target value is required"],
      min: [1, "Target value must be at least 1"],
    },
    currentValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for query optimization
GoalSchema.index({ userId: 1, completed: 1 });
GoalSchema.index({ userId: 1, endDate: 1 });

export default mongoose.models.Goal || mongoose.model<IGoal>("Goal", GoalSchema);
