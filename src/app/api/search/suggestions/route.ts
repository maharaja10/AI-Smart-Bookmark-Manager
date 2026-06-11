import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import Folder from "@/models/Folder";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/suggestions?q=<query>
 *
 * Returns:
 *   - topTags:    top-10 tags by frequency (always returned)
 *   - bookmarks:  up to 5 bookmarks matching q (only when q is provided)
 *   - folders:    up to 5 folders matching q (only when q is provided)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const userId = session.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ── Run all queries in parallel ────────────────────────────────────────
    const [topTagsRaw, bookmarkMatches, folderMatches] = await Promise.all([
      // Top 10 tags by frequency
      Bookmark.aggregate([
        { $match: { userId: userObjectId } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Bookmark suggestions (only if query provided)
      q
        ? Bookmark.find({
            userId: userObjectId,
            $or: [
              { title:       { $regex: q, $options: "i" } },
              { url:         { $regex: q, $options: "i" } },
              { description: { $regex: q, $options: "i" } },
              { tags:        { $regex: q, $options: "i" } },
            ],
          })
            .select("_id title url folderId")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
        : Promise.resolve([]),

      // Folder suggestions (only if query provided)
      q
        ? Folder.aggregate([
            { $match: { userId: userObjectId, name: { $regex: q, $options: "i" } } },
            {
              $lookup: {
                from: "bookmarks",
                let: { fid: "$_id" },
                pipeline: [
                  { $match: { $expr: { $and: [{ $eq: ["$folderId", "$$fid"] }, { $eq: ["$userId", userObjectId] }] } } },
                  { $count: "n" },
                ],
                as: "bk",
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                bookmarkCount: { $ifNull: [{ $arrayElemAt: ["$bk.n", 0] }, 0] },
              },
            },
            { $sort: { bookmarkCount: -1 } },
            { $limit: 5 },
          ])
        : Promise.resolve([]),
    ]);

    // Enrich bookmark matches with folder names
    const bkFolderIds = [
      ...new Set(bookmarkMatches.map((b: any) => b.folderId?.toString()).filter(Boolean)),
    ];
    const folderNameMap: Record<string, string> = {};
    if (bkFolderIds.length > 0) {
      const fDocs = await Folder.find({ _id: { $in: bkFolderIds } }, { name: 1 }).lean();
      fDocs.forEach((f: any) => { folderNameMap[String(f._id)] = f.name; });
    }

    return NextResponse.json({
      topTags: topTagsRaw.map((t: any) => ({ tag: t._id, count: t.count })),
      bookmarks: bookmarkMatches.map((b: any) => ({
        _id:        String(b._id),
        title:      b.title,
        url:        b.url,
        folderName: b.folderId ? (folderNameMap[String(b.folderId)] || null) : null,
      })),
      folders: folderMatches.map((f: any) => ({
        _id:           String(f._id),
        name:          f.name,
        bookmarkCount: f.bookmarkCount,
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/search/suggestions:", error);
    return NextResponse.json({ message: "Failed to fetch suggestions" }, { status: 500 });
  }
}
