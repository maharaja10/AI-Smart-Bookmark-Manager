import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchUrlMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { message: "URL parameter is required" },
        { status: 400 }
      );
    }

    const metadata = await fetchUrlMetadata(url);

    return NextResponse.json({
      title: metadata.ogTitle || metadata.title || "",
      description: metadata.ogDescription || metadata.description || "",
      image: metadata.ogImage || "",
      favicon: metadata.favicon || "",
    });
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      { message: "Error fetching metadata" },
      { status: 500 }
    );
  }
} 