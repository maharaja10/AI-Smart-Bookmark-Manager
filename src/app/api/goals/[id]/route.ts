import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Goal from "@/models/Goal";
import { invalidateProductivityCache } from "@/lib/productivity";
import mongoose from "mongoose";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Invalid goal ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const result = await Goal.deleteOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Goal not found" },
        { status: 404 }
      );
    }

    // Invalidate productivity statistics cache
    invalidateProductivityCache(session.user.id);

    return NextResponse.json({ message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/goals/[id]:", error);
    return NextResponse.json(
      { message: "Error deleting goal" },
      { status: 500 }
    );
  }
}
