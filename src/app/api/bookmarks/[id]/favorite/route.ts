import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import mongoose from "mongoose";
import { buildSnapshot, createVersion, createActivity } from "@/lib/versionHistory";

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

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid bookmark ID" },
        { status: 400 }
      );
    }

    const { isFavorite } = await req.json();

    // Find bookmark
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

    // Capture snapshot before favorite change
    const beforeSnapshot = buildSnapshot(bookmark);

    // Update favorite status
    bookmark.isFavorite = isFavorite;
    await bookmark.save();

    // Record history version and log activity
    try {
      const afterSnapshot = buildSnapshot(bookmark);
      const actionType = isFavorite ? "favorite_added" : "favorite_removed";
      await createVersion(params.id, session.user.id, afterSnapshot, actionType);
      await createActivity(session.user.id, params.id, actionType, {
        bookmarkTitle: bookmark.title,
        bookmarkUrl: bookmark.url,
      });
    } catch (historyErr) {
      console.error("Failed to create history snapshot or activity log:", historyErr);
    }

    const serialized = {
      _id: String(bookmark._id),
      title: bookmark.title,
      url: bookmark.url,
      isFavorite: Boolean(bookmark.isFavorite),
      isReadLater: Boolean(bookmark.isReadLater),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error updating bookmark favorite status:", error);
    return NextResponse.json(
      { message: "Error updating bookmark favorite status" },
      { status: 500 }
    );
  }
} 