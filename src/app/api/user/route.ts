import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Bookmark from "@/models/Bookmark";
import Folder from "@/models/Folder";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Delete user's bookmarks
    await Bookmark.deleteMany({ userId: session.user.id });

    // Delete user's folders
    await Folder.deleteMany({ userId: session.user.id });

    // Delete user
    const result = await User.findByIdAndDelete(session.user.id);

    if (!result) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { message: "Error deleting account" },
      { status: 500 }
    );
  }
} 