import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Folder from "@/models/Folder";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const rawFolders = (await Folder.find({ userId: session.user.id })
      .sort({ name: 1 })
      .lean()) as unknown as Array<any>;

    const folders = rawFolders.map((folder) => ({
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
    }));

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      { message: "Error fetching folders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, description, color, icon, parentId, isPublic } = await req.json();

    // Validate input
    if (!name) {
      return NextResponse.json(
        { message: "Folder name is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if folder with same name already exists
    const existingFolder = await Folder.findOne({
      userId: session.user.id,
      name,
      parentId: parentId || null,
    });

    if (existingFolder) {
      return NextResponse.json(
        { message: "Folder with this name already exists" },
        { status: 409 }
      );
    }

    // Create new folder
    const newFolder = await Folder.create({
      name,
      description: description || "",
      color: color || "#3b82f6",
      icon: icon || "folder",
      userId: session.user.id,
      parentId: parentId || null,
      isPublic: isPublic || false,
      publicId: isPublic ? uuidv4() : null,
    });

    const serialized = {
      _id: String(newFolder._id),
      name: newFolder.name,
      description: newFolder.description || "",
      color: newFolder.color || "#3b82f6",
      icon: newFolder.icon || "folder",
      userId: String(newFolder.userId),
      parentId: newFolder.parentId ? String(newFolder.parentId) : null,
      isPublic: newFolder.isPublic || false,
      publicId: newFolder.publicId || "",
      createdAt: newFolder.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: newFolder.updatedAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { message: "Error creating folder" },
      { status: 500 }
    );
  }
} 