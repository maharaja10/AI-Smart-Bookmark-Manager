import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

interface UserPreferences {
  defaultLandingPage: string;   // "/dashboard" | "/dashboard/bookmarks" | etc.
  defaultExportFormat: string;  // "json" | "csv"
  compactMode: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultLandingPage: "/dashboard",
  defaultExportFormat: "json",
  compactMode: false,
};

function parsePreferences(raw: string | undefined): UserPreferences {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw || "{}") };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

// GET — return current preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id).select("preferences").lean() as any;
    const prefs = parsePreferences(user?.preferences);

    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Error in GET /api/user/preferences:", error);
    return NextResponse.json({ message: "Failed to fetch preferences" }, { status: 500 });
  }
}

// PATCH — update preferences (partial update supported)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const updates = await req.json();
    const user = await User.findById(session.user.id).select("preferences").lean() as any;
    const current = parsePreferences(user?.preferences);
    const merged = { ...current, ...updates };

    await User.findByIdAndUpdate(session.user.id, {
      preferences: JSON.stringify(merged),
    });

    return NextResponse.json(merged);
  } catch (error) {
    console.error("Error in PATCH /api/user/preferences:", error);
    return NextResponse.json({ message: "Failed to update preferences" }, { status: 500 });
  }
}
