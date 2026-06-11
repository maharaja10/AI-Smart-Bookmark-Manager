import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import Folder from "@/models/Folder";
import { buildSnapshot, detectChangeType, createVersion, createActivity } from "@/lib/versionHistory";

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

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid bookmark ID" },
        { status: 400 }
      );
    }

    const rawBookmark = (await Bookmark.findOne({
      _id: params.id,
      userId: session.user.id,
    }).lean()) as any;

    if (!rawBookmark) {
      return NextResponse.json(
        { message: "Bookmark not found" },
        { status: 404 }
      );
    }

    const bookmark = {
      _id: String(rawBookmark._id),
      title: rawBookmark.title,
      url: rawBookmark.url,
      description: rawBookmark.description || "",
      summary: rawBookmark.summary || "",
      tags: rawBookmark.tags || [],
      folderId: rawBookmark.folderId ? String(rawBookmark.folderId) : null,
      userId: String(rawBookmark.userId),
      favicon: rawBookmark.favicon || "",
      ogImage: rawBookmark.ogImage || "",
      ogTitle: rawBookmark.ogTitle || "",
      ogDescription: rawBookmark.ogDescription || "",
      isFavorite: Boolean(rawBookmark.isFavorite),
      isReadLater: Boolean(rawBookmark.isReadLater),
      isPublic: Boolean(rawBookmark.isPublic),
      publicId: rawBookmark.publicId || "",
      visitCount: rawBookmark.visitCount || 0,
      lastVisited: rawBookmark.lastVisited?.toISOString() || null,
      createdAt: rawBookmark.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: rawBookmark.updatedAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error("Error fetching bookmark:", error);
    return NextResponse.json(
      { message: "Error fetching bookmark" },
      { status: 500 }
    );
  }
}

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

    const { title, url, description, tags, folderId, isPublic } = await req.json();

    // Validate input
    if (!title || !url) {
      return NextResponse.json(
        { message: "Title and URL are required" },
        { status: 400 }
      );
    }

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

    // Capture state before update
    const beforeSnapshot = buildSnapshot(bookmark);

    // Update bookmark
    bookmark.title = title;
    bookmark.url = url;
    bookmark.description = description || "";
    bookmark.tags = tags || [];
    bookmark.folderId = folderId || null;
    
    // Handle public status
    if (isPublic !== undefined) {
      bookmark.isPublic = isPublic;
      if (isPublic && !bookmark.publicId) {
        bookmark.publicId = uuidv4();
      }
    }

    await bookmark.save();

    // Capture state after update, create version snapshot and activity log
    try {
      const afterSnapshot = buildSnapshot(bookmark);
      const changeType = detectChangeType(beforeSnapshot, afterSnapshot);
      
      // Determine version number
      await createVersion(params.id, session.user.id, afterSnapshot, changeType);

      // Construct activity metadata
      const activityMetadata: any = {
        bookmarkTitle: bookmark.title,
        bookmarkUrl: bookmark.url,
      };

      if (changeType === "folder_changed") {
        let fromFolderName: string | null = null;
        let toFolderName: string | null = null;

        if (beforeSnapshot.folderId) {
          const fromFolderObj = await Folder.findOne({
            _id: beforeSnapshot.folderId,
            userId: session.user.id,
          }).select("name").lean();
          if (fromFolderObj) fromFolderName = (fromFolderObj as any).name;
        }

        if (afterSnapshot.folderId) {
          const toFolderObj = await Folder.findOne({
            _id: afterSnapshot.folderId,
            userId: session.user.id,
          }).select("name").lean();
          if (toFolderObj) toFolderName = (toFolderObj as any).name;
        }

        activityMetadata.fromFolder = fromFolderName || (beforeSnapshot.folderId ? "Deleted Folder" : null);
        activityMetadata.toFolder = toFolderName || (afterSnapshot.folderId ? "Deleted Folder" : null);
      } else if (changeType === "tags_updated") {
        activityMetadata.fromTags = beforeSnapshot.tags;
        activityMetadata.toTags = afterSnapshot.tags;
      }

      await createActivity(session.user.id, params.id, changeType, activityMetadata);
    } catch (historyErr) {
      console.error("Failed to update history snapshot or activity log:", historyErr);
    }

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
  } catch (error) {
    console.error("Error updating bookmark:", error);
    return NextResponse.json(
      { message: "Error updating bookmark" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await Bookmark.deleteOne({
      _id: params.id,
      userId: session.user.id,
    });

    // Log deletion activity without deleting BookmarkVersion records
    try {
      await createActivity(session.user.id, params.id, "bookmark_deleted", {
        bookmarkTitle: bookmark.title,
        bookmarkUrl: bookmark.url,
      });
    } catch (historyErr) {
      console.error("Failed to log bookmark deletion activity:", historyErr);
    }

    return NextResponse.json({ message: "Bookmark deleted" });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    return NextResponse.json(
      { message: "Error deleting bookmark" },
      { status: 500 }
    );
  }
} 