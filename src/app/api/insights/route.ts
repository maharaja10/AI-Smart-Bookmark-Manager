import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import {
  generateBookmarkInsights,
  InsightBookmark,
} from "@/lib/insights";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Verify authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Check whether the caller wants a forced cache refresh
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "1";

    // 3. Fetch up to 100 bookmarks (only fields needed for insights)
    await connectDB();

    const rawBookmarks = (await Bookmark.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("title description summary tags createdAt")
      .lean()) as unknown as Array<{
      _id: unknown;
      title?: string;
      description?: string;
      summary?: string;
      tags?: string[];
      createdAt?: Date;
    }>;

    const bookmarks: InsightBookmark[] = rawBookmarks.map((b) => ({
      title: b.title || "Untitled",
      description: b.description || "",
      summary: b.summary || "",
      tags: Array.isArray(b.tags) ? b.tags : [],
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : undefined,
    }));

    // 4. Generate (or return cached) insights
    const insights = await generateBookmarkInsights(
      userId,
      bookmarks,
      forceRefresh
    );

    return NextResponse.json(insights);
  } catch (error) {
    console.error("Error generating insights:", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
