import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import { runHealthCheck, HealthBookmark } from "@/lib/healthCheck";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "1";

    await connectDB();

    const rawBookmarks = (await Bookmark.find({ userId })
      .select("_id title url tags description summary")
      .lean()) as unknown as Array<{
      _id: unknown;
      title?: string;
      url?: string;
      tags?: string[];
      description?: string;
      summary?: string;
    }>;

    const bookmarks: HealthBookmark[] = rawBookmarks.map((b) => ({
      id: String(b._id),
      title: b.title || "Untitled",
      url: b.url || "",
      tags: Array.isArray(b.tags) ? b.tags : [],
      description: b.description || "",
      summary: b.summary || "",
    }));

    const report = await runHealthCheck(userId, bookmarks, forceRefresh);

    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
