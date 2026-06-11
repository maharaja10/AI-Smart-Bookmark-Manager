import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import BookmarkVersion from "@/models/BookmarkVersion";
import ActivityLog from "@/models/ActivityLog";
import { getVersionHistory, buildSnapshot } from "@/lib/versionHistory";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: "Invalid bookmark ID" }, { status: 400 });
    }

    // 1. Fetch versions from database
    const dbVersions = await getVersionHistory(params.id, session.user.id);

    // 2. Check if the bookmark exists in the primary collection
    const bookmark = await Bookmark.findOne({
      _id: params.id,
      userId: session.user.id,
    }).lean() as any;

    if (bookmark) {
      // Bookmark is active
      if (dbVersions.length === 0) {
        // Synthesize Version 1 for legacy bookmarks
        const snapshot = buildSnapshot(bookmark);
        const syntheticVersion = {
          _id: `synthetic-${bookmark._id}`,
          bookmarkId: String(bookmark._id),
          userId: String(bookmark.userId),
          versionNumber: 1,
          changeType: "bookmark_created" as const,
          snapshot,
          createdAt: bookmark.createdAt ? bookmark.createdAt.toISOString() : new Date().toISOString(),
        };
        return NextResponse.json({
          versions: [syntheticVersion],
          isDeleted: false,
          bookmarkTitle: bookmark.title,
          bookmarkUrl: bookmark.url,
        });
      }

      return NextResponse.json({
        versions: dbVersions,
        isDeleted: false,
        bookmarkTitle: bookmark.title,
        bookmarkUrl: bookmark.url,
      });
    } else {
      // Bookmark has been deleted
      if (dbVersions.length === 0) {
        return NextResponse.json({ message: "Bookmark history not found" }, { status: 404 });
      }

      // Find when it was deleted
      const deletionActivity = await ActivityLog.findOne({
        bookmarkId: new mongoose.Types.ObjectId(params.id),
        action: "bookmark_deleted",
      }).select("createdAt metadata").lean() as any;

      const deletedAt = deletionActivity ? deletionActivity.createdAt.toISOString() : dbVersions[0].createdAt;
      const title = deletionActivity?.metadata?.bookmarkTitle || dbVersions[0].snapshot.title || "Deleted Bookmark";
      const url = deletionActivity?.metadata?.bookmarkUrl || dbVersions[0].snapshot.url || "";

      return NextResponse.json({
        versions: dbVersions,
        isDeleted: true,
        deletedAt,
        bookmarkTitle: title,
        bookmarkUrl: url,
      });
    }
  } catch (error) {
    console.error("Error fetching bookmark version history:", error);
    return NextResponse.json(
      { message: "Error fetching bookmark version history" },
      { status: 500 }
    );
  }
}
