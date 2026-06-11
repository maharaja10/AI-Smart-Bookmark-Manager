import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import { askBookmarkAssistant, BookmarkContext } from "@/lib/assistant";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { question } = body as { question?: string };

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { message: "A non-empty question is required." },
        { status: 400 }
      );
    }

    // 3. Fetch user's bookmarks (up to 50, most recent first)
    await connectDB();

    const rawBookmarks = (await Bookmark.find({
      userId: session.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("title description summary tags url createdAt")
      .lean()) as unknown as Array<{
        _id: unknown;
        title?: string;
        description?: string;
        summary?: string;
        tags?: string[];
        url?: string;
        createdAt?: Date;
      }>;

    const bookmarks: BookmarkContext[] = rawBookmarks.map((b) => ({
      title: b.title || "Untitled",
      description: b.description || "",
      summary: b.summary || "",
      tags: Array.isArray(b.tags) ? b.tags : [],
      url: b.url || "",
      createdAt: b.createdAt
        ? new Date(b.createdAt).toISOString()
        : undefined,
    }));

    // 5. Send to Gemini and get answer
    const answer = await askBookmarkAssistant(question.trim(), bookmarks);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Error in assistant route:", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
