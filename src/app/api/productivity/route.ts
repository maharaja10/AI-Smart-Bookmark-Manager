import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { generateProductivitySummary } from "@/lib/productivity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get("refresh") === "true";

    const summary = await generateProductivitySummary(session.user.id, refresh);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error in GET /api/productivity:", error);
    return NextResponse.json(
      { message: "Error fetching productivity statistics" },
      { status: 500 }
    );
  }
}
