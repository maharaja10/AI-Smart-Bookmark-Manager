import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import Folder from "@/models/Folder";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

type SortOption = "newest" | "oldest" | "updated" | "read" | "az" | "za";

function buildSortStage(sort: SortOption): Record<string, 1 | -1> {
  switch (sort) {
    case "oldest":    return { createdAt: 1 };
    case "updated":   return { updatedAt: -1 };
    case "read":      return { lastVisited: -1 };
    case "az":        return { title: 1 };
    case "za":        return { title: -1 };
    default:          return { createdAt: -1 }; // newest
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q        = searchParams.get("q")?.trim() || "";
    const filter   = searchParams.get("filter") || "";   // favorite|readlater|read|unread
    const folderId = searchParams.get("folderId") || "";
    const tags     = searchParams.getAll("tags");         // multi-value
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo   = searchParams.get("dateTo") || "";
    const sort     = (searchParams.get("sort") || "newest") as SortOption;
    const page     = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit    = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const skip     = (page - 1) * limit;

    const userId = session.user.id;

    // ── Base query ──────────────────────────────────────────────────────────
    const query: any = { userId };

    // Text / regex search
    if (q) {
      query.$or = [
        { title:       { $regex: q, $options: "i" } },
        { url:         { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { summary:     { $regex: q, $options: "i" } },
        { tags:        { $regex: q, $options: "i" } },
      ];
    }

    // Boolean filters
    if (filter === "favorite")  query.isFavorite  = true;
    if (filter === "readlater") query.isReadLater  = true;
    if (filter === "read")      query.isRead       = true;
    if (filter === "unread")    query.isRead       = false;

    // Folder filter
    if (folderId) {
      query.folderId = folderId === "null" ? null :
        mongoose.Types.ObjectId.isValid(folderId)
          ? new mongoose.Types.ObjectId(folderId)
          : folderId;
    }

    // Tag filter (AND: all must match)
    if (tags.length > 0) {
      query.tags = { $all: tags };
    }

    // Date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   query.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z");
    }

    // ── Execute ──────────────────────────────────────────────────────────────
    const [total, rawBookmarks] = await Promise.all([
      Bookmark.countDocuments(query),
      Bookmark.find(query)
        .sort(buildSortStage(sort))
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Enrich with folder names in one batch query
    const folderIds = [...new Set(
      rawBookmarks
        .map((b: any) => b.folderId?.toString())
        .filter(Boolean)
    )];

    const folders: Record<string, string> = {};
    if (folderIds.length > 0) {
      const folderDocs = await Folder.find(
        { _id: { $in: folderIds } },
        { name: 1 }
      ).lean();
      folderDocs.forEach((f: any) => { folders[String(f._id)] = f.name; });
    }

    const bookmarks = rawBookmarks.map((b: any) => ({
      _id:         String(b._id),
      title:       b.title,
      url:         b.url,
      description: b.description || "",
      summary:     b.summary     || "",
      tags:        b.tags        || [],
      folderId:    b.folderId    ? String(b.folderId) : null,
      folderName:  b.folderId    ? (folders[String(b.folderId)] || null) : null,
      ogImage:     b.ogImage     || "",
      isFavorite:  Boolean(b.isFavorite),
      isReadLater: Boolean(b.isReadLater),
      isRead:      Boolean(b.isRead),
      createdAt:   b.createdAt?.toISOString() || "",
      updatedAt:   b.updatedAt?.toISOString() || "",
    }));

    return NextResponse.json({
      bookmarks,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error in GET /api/search:", error);
    return NextResponse.json({ message: "Search failed" }, { status: 500 });
  }
}
