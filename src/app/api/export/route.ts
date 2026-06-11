import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import Folder from "@/models/Folder";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function bookmarksToCsv(bookmarks: any[], folderMap: Record<string, string>): string {
  const headers = ["title", "url", "description", "tags", "folder", "isFavorite", "isReadLater", "isRead", "createdAt"];
  const rows = bookmarks.map((b) => [
    escapeCsvField(b.title || ""),
    escapeCsvField(b.url || ""),
    escapeCsvField(b.description || ""),
    escapeCsvField((b.tags || []).join("|")),
    escapeCsvField(b.folderId ? (folderMap[String(b.folderId)] || "") : ""),
    b.isFavorite  ? "true" : "false",
    b.isReadLater ? "true" : "false",
    b.isRead      ? "true" : "false",
    b.createdAt?.toISOString() || "",
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const format   = searchParams.get("format")   || "json"; // json | csv
    const scope    = searchParams.get("scope")    || "all";  // all | favorites | readlater | folder
    const folderId = searchParams.get("folderId") || "";

    const userId = session.user.id;

    // Build filter
    const query: any = { userId };
    if (scope === "favorites")  query.isFavorite  = true;
    if (scope === "readlater")  query.isReadLater  = true;
    if (scope === "folder" && folderId) {
      query.folderId = mongoose.Types.ObjectId.isValid(folderId)
        ? new mongoose.Types.ObjectId(folderId)
        : null;
    }

    const rawBookmarks = await Bookmark.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Build folder name map
    const folderIds = [
      ...new Set(rawBookmarks.map((b: any) => b.folderId?.toString()).filter(Boolean)),
    ];
    const folderMap: Record<string, string> = {};
    if (folderIds.length > 0) {
      const folders = await Folder.find({ _id: { $in: folderIds } }, { name: 1 }).lean();
      folders.forEach((f: any) => { folderMap[String(f._id)] = f.name; });
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const scopeLabel = scope === "all" ? "bookmarks" : scope === "folder" ? "folder" : scope;

    if (format === "csv") {
      const csv = bookmarksToCsv(rawBookmarks, folderMap);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${scopeLabel}-${dateStr}.csv"`,
        },
      });
    }

    // JSON export
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.email || session.user.id,
      scope,
      totalCount: rawBookmarks.length,
      bookmarks: rawBookmarks.map((b: any) => ({
        title:       b.title,
        url:         b.url,
        description: b.description || "",
        summary:     b.summary     || "",
        tags:        b.tags        || [],
        folder:      b.folderId    ? (folderMap[String(b.folderId)] || null) : null,
        isFavorite:  Boolean(b.isFavorite),
        isReadLater: Boolean(b.isReadLater),
        isRead:      Boolean(b.isRead),
        createdAt:   b.createdAt?.toISOString() || "",
        updatedAt:   b.updatedAt?.toISOString() || "",
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${scopeLabel}-${dateStr}.json"`,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/export:", error);
    return NextResponse.json({ message: "Export failed" }, { status: 500 });
  }
}
