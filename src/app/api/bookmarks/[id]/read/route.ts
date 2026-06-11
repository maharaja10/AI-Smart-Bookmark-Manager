import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import { invalidateAnalyticsCache } from "@/lib/analytics";
import { invalidateProductivityCache } from "@/lib/productivity";
import { createActivity } from "@/lib/versionHistory";
import mongoose from "mongoose";

export async function PATCH(
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
      return NextResponse.json(
        { message: "Invalid bookmark ID" },
        { status: 400 }
      );
    }

    const { isRead } = await req.json();

    const bookmark = await Bookmark.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!bookmark) {
      return NextResponse.json(
        { message: "Bookmark not found" },
        { status: 404 }
      );
    }

    // Update read status
    bookmark.isRead = isRead;
    bookmark.readAt = isRead ? new Date() : null;
    await bookmark.save();

    // Record activity log (read status is not a versioned snapshot field)
    try {
      const actionType = isRead ? "bookmark_read" : "bookmark_unread";
      await createActivity(session.user.id, params.id, actionType, {
        bookmarkTitle: bookmark.title,
        bookmarkUrl: bookmark.url,
      });
    } catch (historyErr) {
      console.error("Failed to record read status activity:", historyErr);
    }

    // Invalidate caches
    invalidateAnalyticsCache(session.user.id);
    invalidateProductivityCache(session.user.id);

    const serialized = {
      _id: String(bookmark._id),
      title: bookmark.title,
      url: bookmark.url,
      isRead: Boolean(bookmark.isRead),
      readAt: bookmark.readAt?.toISOString() || null,
      isFavorite: Boolean(bookmark.isFavorite),
      isReadLater: Boolean(bookmark.isReadLater),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error in PATCH /api/bookmarks/[id]/read:", error);
    return NextResponse.json(
      { message: "Error updating bookmark read status" },
      { status: 500 }
    );
  }
}
