import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import Folder, { IFolder } from "@/models/Folder";
import { classifyBookmark } from "@/lib/organizer";
import mongoose from "mongoose";

// Category color helper for premium aesthetics
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Frontend: "#ec4899",      // Pink
    Backend: "#8b5cf6",       // Purple
    "AI & ML": "#10b981",     // Emerald
    Programming: "#3b82f6",   // Blue
    DSA: "#f59e0b",           // Amber
    Career: "#06b6d4",        // Cyan
    DevOps: "#6366f1",        // Indigo
    Design: "#f43f5e",        // Rose
    "Social Media": "#14b8a6", // Teal
    Other: "#6b7280",         // Gray
  };
  return colors[category] || "#3b82f6";
}

interface FolderMap {
  _id: string;
  name: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch user bookmarks and folders
    const bookmarks = await Bookmark.find({ userId: session.user.id })
      .select("title description summary tags folderId")
      .lean();

    const folders = (await Folder.find({ userId: session.user.id })
      .select("name")
      .lean()) as unknown as FolderMap[];

    const folderMap = new Map<string, string>();
    folders.forEach((f) => {
      folderMap.set(String(f._id), f.name);
    });

    const suggestions = [];

    for (const b of bookmarks) {
      const classification = await classifyBookmark({
        title: b.title || "",
        description: b.description || "",
        summary: b.summary || "",
        tags: b.tags || [],
      });

      const currentFolderId = b.folderId ? String(b.folderId) : null;
      const currentFolderName = currentFolderId ? (folderMap.get(currentFolderId) || null) : null;

      suggestions.push({
        bookmarkId: String(b._id),
        title: b.title || "",
        currentFolder: currentFolderName,
        suggestedFolder: classification.suggestedFolder,
        confidence: classification.confidence,
      });
    }

    return NextResponse.json(suggestions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error generating suggestions";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch user bookmarks and existing folders
    const bookmarks = await Bookmark.find({ userId: session.user.id });
    const folders = (await Folder.find({ userId: session.user.id })) as IFolder[];

    // Map folder names to their existing models
    const folderByName = new Map<string, IFolder>();
    folders.forEach((f) => {
      folderByName.set(f.name.toLowerCase().trim(), f);
    });

    let updatedCount = 0;
    let foldersCreatedCount = 0;

    for (const b of bookmarks) {
      const classification = await classifyBookmark({
        title: b.title || "",
        description: b.description || "",
        summary: b.summary || "",
        tags: b.tags || [],
      });

      const currentFolderId = b.folderId ? String(b.folderId) : null;
      const existingFolder = b.folderId ? folders.find((f) => String(f._id) === currentFolderId) : null;
      const currentFolderName = existingFolder ? existingFolder.name : null;

      // Only perform update/move if folder changes or if metadata was not saved
      if (
        currentFolderName?.toLowerCase().trim() !== classification.suggestedFolder.toLowerCase().trim() ||
        b.aiFolderSuggestion !== classification.suggestedFolder ||
        b.aiFolderConfidence !== classification.confidence
      ) {
        const key = classification.suggestedFolder.toLowerCase().trim();
        let targetFolder = folderByName.get(key);

        if (!targetFolder && classification.suggestedFolder !== "Other") {
          // Auto-create folder with unique category color and default style
          const newFolderDoc = (await Folder.create({
            name: classification.suggestedFolder,
            description: `Automatically created for ${classification.suggestedFolder} bookmarks`,
            color: getCategoryColor(classification.suggestedFolder),
            icon: "folder",
            userId: new mongoose.Types.ObjectId(session.user.id),
          })) as IFolder;
          targetFolder = newFolderDoc;
          folderByName.set(key, newFolderDoc);
          foldersCreatedCount++;
        }

        // Apply folder changes
        b.folderId = targetFolder ? targetFolder._id : null;
        b.aiFolderSuggestion = classification.suggestedFolder;
        b.aiFolderConfidence = classification.confidence;
        await b.save();

        updatedCount++;
      }
    }

    return NextResponse.json({
      updated: updatedCount,
      foldersCreated: foldersCreatedCount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error applying organization";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
