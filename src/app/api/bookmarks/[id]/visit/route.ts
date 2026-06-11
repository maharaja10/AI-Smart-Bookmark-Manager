import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import mongoose from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid bookmark ID" },
        { status: 400 }
      );
    }

    // Find and update bookmark
    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: params.id, userId: session.user.id },
      { 
        $inc: { visitCount: 1 },
        lastVisited: new Date()
      },
      { new: true }
    );

    if (!bookmark) {
      return NextResponse.json(
        { message: "Bookmark not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating bookmark visit count:", error);
    return NextResponse.json(
      { message: "Error updating bookmark visit count" },
      { status: 500 }
    );
  }
} 