import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Folder from "@/models/Folder";
import Bookmark from "@/models/Bookmark";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

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
        { message: "Invalid folder ID" },
        { status: 400 }
      );
    }

    const rawFolder = (await Folder.findOne({
      _id: params.id,
      userId: session.user.id,
    }).lean()) as any;

    if (!rawFolder) {
      return NextResponse.json(
        { message: "Folder not found" },
        { status: 404 }
      );
    }

    const folder = {
      _id: String(rawFolder._id),
      name: rawFolder.name,
      description: rawFolder.description || "",
      color: rawFolder.color || "#3b82f6",
      icon: rawFolder.icon || "folder",
      userId: String(rawFolder.userId),
      parentId: rawFolder.parentId ? String(rawFolder.parentId) : null,
      isPublic: rawFolder.isPublic || false,
      publicId: rawFolder.publicId || "",
      createdAt: rawFolder.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: rawFolder.updatedAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error fetching folder:", error);
    return NextResponse.json(
      { message: "Error fetching folder" },
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
        { message: "Invalid folder ID" },
        { status: 400 }
      );
    }

    const data = await req.json();
    const { name, description, color, icon, isPublic } = data;
    
    // Validate input
    if (!name) {
      return NextResponse.json(
        { message: "Folder name is required" },
        { status: 400 }
      );
    }

    // Find folder
    const folder = await Folder.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!folder) {
      return NextResponse.json(
        { message: "Folder not found" },
        { status: 404 }
      );
    }

    // Update folder
    folder.name = name;
    folder.description = description || "";
    folder.color = color || "#3b82f6";
    folder.icon = icon || "folder";
    
    // Handle public status
    if (isPublic !== undefined) {
      folder.isPublic = isPublic;
      if (isPublic && !folder.publicId) {
        folder.publicId = uuidv4();
      }
    }

    await folder.save();
    
    const serialized = {
      _id: String(folder._id),
      name: folder.name,
      description: folder.description || "",
      color: folder.color || "#3b82f6",
      icon: folder.icon || "folder",
      userId: String(folder.userId),
      parentId: folder.parentId ? String(folder.parentId) : null,
      isPublic: folder.isPublic || false,
      publicId: folder.publicId || "",
      createdAt: folder.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: folder.updatedAt?.toISOString() || new Date().toISOString(),
    };
    
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json(
      { message: "Error updating folder" },
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
        { message: "Invalid folder ID" },
        { status: 400 }
      );
    }

    // Check if folder has bookmarks
    const bookmarkCount = await Bookmark.countDocuments({
      folderId: params.id,
      userId: session.user.id,
    });

    if (bookmarkCount > 0) {
      return NextResponse.json(
        { message: "Cannot delete folder with bookmarks" },
        { status: 400 }
      );
    }

    // Delete folder
    const result = await Folder.deleteOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Folder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Folder deleted" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      { message: "Error deleting folder" },
      { status: 500 }
    );
  }
} 