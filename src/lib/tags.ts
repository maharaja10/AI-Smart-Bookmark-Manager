import connectDB from "./mongodb";
import Bookmark from "@/models/Bookmark";
import mongoose from "mongoose";

export interface TagWithCount {
  name: string;
  count: number;
}

/**
 * Retrieves all tags with their respective bookmark count for a given user.
 */
export async function getUserTags(userId: string): Promise<TagWithCount[]> {
  await connectDB();
  
  const tagCounts = await Bookmark.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId) 
      } 
    },
    { $unwind: "$tags" },
    { 
      $group: { 
        _id: "$tags", 
        count: { $sum: 1 } 
      } 
    },
    { $sort: { count: -1 } },
  ]);

  return tagCounts.map((tag) => ({
    name: tag._id,
    count: tag.count,
  }));
}
