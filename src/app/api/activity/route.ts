import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { getActivityFeed } from "@/lib/versionHistory";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const feed = await getActivityFeed(session.user.id, page, limit);

    return NextResponse.json({
      activities: feed.activities,
      pagination: {
        total: feed.total,
        page: feed.page,
        limit,
        pages: feed.pages,
      },
    });
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    return NextResponse.json(
      { message: "Error fetching activity feed" },
      { status: 500 }
    );
  }
}
