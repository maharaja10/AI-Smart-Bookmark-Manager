import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import { v4 as uuidv4 } from "uuid";
import { fetchUrlMetadata } from "@/lib/metadata";
import { generateSummary, suggestTags, parseSearchQuery } from "@/lib/ai";
import mongoose from "mongoose";
import { buildSnapshot, createVersion, createActivity } from "@/lib/versionHistory";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const nl = searchParams.get("nl");
    const filter = searchParams.get("filter");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { userId: session.user.id };

    if (folder) {
      query.folderId = folder === "null" ? null : 
        mongoose.Types.ObjectId.isValid(folder) ? new mongoose.Types.ObjectId(folder) : folder;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      if (nl === "1") {
        try {
          const parsed = await parseSearchQuery(search);
          
          const orConditions: any[] = [];
          for (const keyword of parsed.keywords) {
            orConditions.push(
              { title: { $regex: keyword, $options: "i" } },
              { url: { $regex: keyword, $options: "i" } },
              { description: { $regex: keyword, $options: "i" } },
              { summary: { $regex: keyword, $options: "i" } },
              { tags: { $regex: keyword, $options: "i" } }
            );
          }
          query.$or = orConditions;
        } catch (error) {
          console.error("Error parsing natural language search:", error);
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { url: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { summary: { $regex: search, $options: "i" } },
            { tags: { $regex: search, $options: "i" } },
          ];
        }
      } else {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { url: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { summary: { $regex: search, $options: "i" } },
          { tags: { $regex: search, $options: "i" } },
        ];
      }
    }

    if (filter === "favorite") {
      query.isFavorite = true;
    } else if (filter === "readlater") {
      query.isReadLater = true;
    }

    // Get total count
    const total = await Bookmark.countDocuments(query);

    // Get bookmarks
    const rawBookmarks = (await Bookmark.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()) as unknown as Array<any>;

    const bookmarks = rawBookmarks.map((bookmark) => ({
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
    }));

    return NextResponse.json({
      bookmarks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      { message: "Error fetching bookmarks" },
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

    const { title, url, description, tags, folderId, isPublic } = await req.json();

    // Validate input
    if (!title || !url) {
      return NextResponse.json(
        { message: "Title and URL are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({
      userId: session.user.id,
      url,
    });

    if (existingBookmark) {
      return NextResponse.json(
        { message: "Bookmark already exists" },
        { status: 409 }
      );
    }

    // Fetch metadata for the URL
    const metadata = await fetchUrlMetadata(url);

    // Generate tags if not provided
    let finalTags = tags || [];
    if (finalTags.length === 0 && process.env.GEMINI_API_KEY) {
      try {
        const suggestedTags = await suggestTags(url, title, description || metadata.description || "");
        if (suggestedTags && suggestedTags.length > 0) {
          finalTags = suggestedTags;
        }
      } catch (error) {
        console.error("Error suggesting tags:", error);
      }
    }

    // Generate summary with safe fallback
    const summarySource = description || metadata.description || "";
    const summary = await generateSummary(url, title, summarySource);

    // Create new bookmark
    const newBookmark = await Bookmark.create({
      title,
      url,
      description: description || "",
      tags: finalTags,
      summary,
      folderId: folderId || null,
      userId: session.user.id,
      favicon: metadata.favicon || "",
      ogImage: metadata.ogImage || "",
      ogTitle: metadata.ogTitle || "",
      ogDescription: metadata.ogDescription || "",
      isPublic: isPublic || false,
      publicId: isPublic ? uuidv4() : null,
    });

    // Capture version snapshot and log activity
    try {
      const snapshot = buildSnapshot(newBookmark);
      await createVersion(
        String(newBookmark._id),
        session.user.id,
        snapshot,
        "bookmark_created"
      );
      await createActivity(
        session.user.id,
        String(newBookmark._id),
        "bookmark_created",
        {
          bookmarkTitle: newBookmark.title,
          bookmarkUrl: newBookmark.url,
        }
      );
    } catch (historyErr) {
      console.error("Failed to create history snapshot or activity log:", historyErr);
    }

    const serialized = {
      _id: String(newBookmark._id),
      title: newBookmark.title,
      url: newBookmark.url,
      description: newBookmark.description || "",
      summary: newBookmark.summary || "",
      tags: newBookmark.tags || [],
      folderId: newBookmark.folderId ? String(newBookmark.folderId) : null,
      userId: String(newBookmark.userId),
      favicon: newBookmark.favicon || "",
      ogImage: newBookmark.ogImage || "",
      ogTitle: newBookmark.ogTitle || "",
      ogDescription: newBookmark.ogDescription || "",
      isFavorite: Boolean(newBookmark.isFavorite),
      isReadLater: Boolean(newBookmark.isReadLater),
      isPublic: Boolean(newBookmark.isPublic),
      publicId: newBookmark.publicId || "",
      visitCount: newBookmark.visitCount || 0,
      lastVisited: newBookmark.lastVisited?.toISOString() || null,
      createdAt: newBookmark.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: newBookmark.updatedAt?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json(serialized, { status: 201 });
  } catch (error) {
    console.error("Error creating bookmark:", error);
    return NextResponse.json(
      { message: "Error creating bookmark" },
      { status: 500 }
    );
  }
} 