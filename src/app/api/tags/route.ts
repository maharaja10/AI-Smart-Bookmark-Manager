import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserTags } from "@/lib/tags";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tags = await getUserTags(session.user.id);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags API:", error);
    return NextResponse.json(
      { message: "Error fetching tags" },
      { status: 500 }
    );
  }
}
