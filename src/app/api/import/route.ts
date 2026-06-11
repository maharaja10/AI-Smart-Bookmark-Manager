import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import Folder from "@/models/Folder";

export const dynamic = "force-dynamic";

interface ImportBookmark {
  title: string;
  url: string;
  description?: string;
  tags?: string[];
  folder?: string;
  isFavorite?: boolean;
  isReadLater?: boolean;
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const incoming: ImportBookmark[] = body.bookmarks || [];
    const skipDuplicates: boolean = body.skipDuplicates !== false;

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ message: "No bookmarks provided" }, { status: 400 });
    }

    const userId = session.user.id;

    // ── Fetch existing URLs for duplicate detection ────────────────────────
    const existingUrls = new Set<string>(
      (await Bookmark.find({ userId }).select("url").lean())
        .map((b: any) => b.url.trim().toLowerCase())
    );

    // ── Resolve/create folder names ────────────────────────────────────────
    const folderNameCache: Record<string, string> = {}; // name → _id

    async function resolveFolderId(name?: string): Promise<string | null> {
      if (!name?.trim()) return null;
      const key = name.trim().toLowerCase();
      if (folderNameCache[key]) return folderNameCache[key];

      let folder = await Folder.findOne({ userId, name: name.trim() }).lean() as any;
      if (!folder) {
        folder = await Folder.create({ userId, name: name.trim() });
      }
      folderNameCache[key] = String(folder._id);
      return String(folder._id);
    }

    // ── Process records ────────────────────────────────────────────────────
    const toInsert: any[]  = [];
    const skipped: string[]  = [];
    const failed:  string[]  = [];

    for (const item of incoming) {
      const url = (item.url || "").trim();
      const title = (item.title || "").trim();

      if (!url || !title) {
        failed.push(url || "(missing url)");
        continue;
      }

      if (!isValidUrl(url)) {
        failed.push(url);
        continue;
      }

      if (existingUrls.has(url.toLowerCase())) {
        if (skipDuplicates) {
          skipped.push(url);
          continue;
        }
        // If not skipping, still skip to avoid DB unique constraint error
        skipped.push(url);
        continue;
      }

      const folderId = await resolveFolderId(item.folder);
      existingUrls.add(url.toLowerCase()); // prevent dupes within the batch

      toInsert.push({
        title,
        url,
        description: item.description || "",
        tags: (item.tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean),
        folderId:    folderId || null,
        userId,
        isFavorite:  Boolean(item.isFavorite),
        isReadLater: Boolean(item.isReadLater),
        isRead:      false,
        sortOrder:   0,
      });
    }

    // ── Bulk insert ────────────────────────────────────────────────────────
    let imported = 0;
    const insertErrors: string[] = [];

    if (toInsert.length > 0) {
      const result = await Bookmark.insertMany(toInsert, { ordered: false });
      imported = result.length;
    }

    return NextResponse.json({
      imported,
      skipped: skipped.length,
      failed: failed.length + insertErrors.length,
      errors: [...failed, ...insertErrors],
    });
  } catch (error) {
    console.error("Error in POST /api/import:", error);
    return NextResponse.json({ message: "Import failed" }, { status: 500 });
  }
}
