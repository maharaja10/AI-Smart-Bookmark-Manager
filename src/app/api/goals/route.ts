import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Goal from "@/models/Goal";
import { invalidateProductivityCache } from "@/lib/productivity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const goals = await Goal.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(goals);
  } catch (error) {
    console.error("Error in GET /api/goals:", error);
    return NextResponse.json(
      { message: "Error fetching goals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { title, goalType, targetValue, startDate, endDate } = await req.json();

    if (!title || !goalType || !targetValue || !startDate || !endDate) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const newGoal = await Goal.create({
      userId: session.user.id,
      title,
      goalType,
      targetValue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      currentValue: 0,
      completed: false,
    });

    // Invalidate the productivity statistics cache
    invalidateProductivityCache(session.user.id);

    return NextResponse.json(newGoal, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/goals:", error);
    return NextResponse.json(
      { message: "Error creating goal" },
      { status: 500 }
    );
  }
}
