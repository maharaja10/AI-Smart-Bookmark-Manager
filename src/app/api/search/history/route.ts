import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SearchHistory from "@/models/SearchHistory";

export const dynamic = "force-dynamic";

// GET — return the 10 most recent searches for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const history = await SearchHistory.find({ userId: session.user.id })
      .sort({ searchedAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json(
      history.map((h: any) => ({
        _id:        String(h._id),
        query:      h.query,
        searchedAt: h.searchedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error in GET /api/search/history:", error);
    return NextResponse.json({ message: "Failed to fetch history" }, { status: 500 });
  }
}

// POST — record a new search (deduplicate, keep only latest 10)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { query } = await req.json();
    if (!query?.trim()) {
      return NextResponse.json({ message: "Query is required" }, { status: 400 });
    }

    await connectDB();

    const userId = session.user.id;
    const trimmed = query.trim();

    // Remove any existing entry with the same query (upsert-like dedup)
    await SearchHistory.deleteOne({ userId, query: trimmed });

    // Insert new
    await SearchHistory.create({ userId, query: trimmed });

    // Prune to keep only the latest 10
    const all = await SearchHistory.find({ userId })
      .sort({ searchedAt: -1 })
      .lean();

    if (all.length > 10) {
      const toDelete = all.slice(10).map((h: any) => h._id);
      await SearchHistory.deleteMany({ _id: { $in: toDelete } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/search/history:", error);
    return NextResponse.json({ message: "Failed to record search" }, { status: 500 });
  }
}

// DELETE — clear all search history for the user
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    await SearchHistory.deleteMany({ userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/search/history:", error);
    return NextResponse.json({ message: "Failed to clear history" }, { status: 500 });
  }
}
