import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import { restoreVersion } from "@/lib/versionHistory";
import mongoose from "mongoose";

export async function POST(
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

    const { versionId } = await req.json();
    if (!versionId) {
      return NextResponse.json({ message: "Version ID is required" }, { status: 400 });
    }

    // Find current active bookmark
    const bookmark = await Bookmark.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!bookmark) {
      return NextResponse.json(
        { message: "Active bookmark not found. Deleted bookmarks cannot be restored." },
        { status: 404 }
      );
    }

    // Call library to record the version restore snapshot and timeline log
    const { snapshot } = await restoreVersion(params.id, session.user.id, versionId);

    // Apply snapshot state back to the active bookmark document
    bookmark.title = snapshot.title;
    bookmark.url = snapshot.url;
    bookmark.description = snapshot.description;
    bookmark.summary = snapshot.summary;
    bookmark.tags = snapshot.tags;
    bookmark.folderId = snapshot.folderId || null;
    bookmark.isFavorite = snapshot.isFavorite;
    bookmark.isReadLater = snapshot.isReadLater;

    await bookmark.save();

    const serialized = {
      _id: String(bookmark._id),
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || "",
      summary: bookmark.summary || "",
      tags: bookmark.tags || [],
      folderId: bookmark.folderId ? String(bookmark.folderId) : null,
      userId: String(bookmark.userId),
      favicon: bookmark.favicon || "",
      ogImage: bookmark.ogImage || "",
      ogTitle: bookmark.ogTitle || "",
      ogDescription: bookmark.ogDescription || "",
      isFavorite: Boolean(bookmark.isFavorite),
      isReadLater: Boolean(bookmark.isReadLater),
      isPublic: Boolean(bookmark.isPublic),
      publicId: bookmark.publicId || "",
      visitCount: bookmark.visitCount || 0,
      lastVisited: bookmark.lastVisited?.toISOString() || null,
      createdAt: bookmark.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: bookmark.updatedAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error("Error restoring bookmark version:", error);
    return NextResponse.json(
      { message: error.message || "Error restoring bookmark version" },
      { status: 500 }
    );
  }
}
