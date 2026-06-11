import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import Folder from "@/models/Folder";
import User from "@/models/User";
import BookmarkGrid, { type BookmarkListItem } from "@/components/dashboard/BookmarkGrid";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import AdvancedFilters from "@/components/dashboard/AdvancedFilters";
import mongoose from "mongoose";
import { getUserTags } from "@/lib/tags";

interface BookmarksPageProps {
  searchParams: {
    folder?: string;
    tag?: string;
    tags?: string;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
    filter?: string;
    page?: string;
  };
}

function parsePreferences(raw: string | undefined) {
  try {
    return { compactMode: false, ...JSON.parse(raw || "{}") };
  } catch {
    return { compactMode: false };
  }
}

export default async function BookmarksPage({ searchParams }: BookmarksPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Loading...</div>;
  }
  
  await connectDB();
  
  const folder = searchParams.folder;
  const tag = searchParams.tag;
  const tagsParam = searchParams.tags;
  const search = searchParams.search;
  const status = searchParams.status;
  const startDate = searchParams.startDate;
  const endDate = searchParams.endDate;
  const sort = searchParams.sort || "createdAt_desc";
  const page = parseInt(searchParams.page || "1");
  const limit = 12;
  const skip = (page - 1) * limit;
  
  // Build query
  const query: any = { userId: session.user.id };
  
  if (folder) {
    query.folderId = folder === "null" ? null : 
      mongoose.Types.ObjectId.isValid(folder) ? new mongoose.Types.ObjectId(folder) : folder;
  }
  
  // Tag filtration
  if (tag) {
    query.tags = tag;
  } else if (tagsParam) {
    const parsedTags = tagsParam.split(",").map(t => t.trim()).filter(Boolean);
    if (parsedTags.length > 0) {
      query.tags = { $all: parsedTags };
    }
  }
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { url: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { summary: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }
  
  // Status filtration
  if (status === "favorite") {
    query.isFavorite = true;
  } else if (status === "readlater") {
    query.isReadLater = true;
  } else if (status === "read") {
    query.isRead = true;
  } else if (status === "unread") {
    query.isRead = false;
  } else {
    // Legacy support
    const legacyFilter = searchParams.filter;
    if (legacyFilter === "favorite") {
      query.isFavorite = true;
    } else if (legacyFilter === "readlater") {
      query.isReadLater = true;
    }
  }

  // Date range filtration
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const date = new Date(endDate);
      date.setHours(23, 59, 59, 999);
      query.createdAt.$lte = date;
    }
  }
  
  // Sorting options
  let sortOption: any = { createdAt: -1 };
  if (sort === "createdAt_asc") sortOption = { createdAt: 1 };
  else if (sort === "createdAt_desc") sortOption = { createdAt: -1 };
  else if (sort === "updatedAt_asc") sortOption = { updatedAt: 1 };
  else if (sort === "updatedAt_desc") sortOption = { updatedAt: -1 };
  else if (sort === "lastVisited_asc") sortOption = { lastVisited: 1 };
  else if (sort === "lastVisited_desc") sortOption = { lastVisited: -1 };
  
  // Get total count
  const total = await Bookmark.countDocuments(query);
  
  // Get bookmarks
  const rawBookmarks = (await Bookmark.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .lean()) as unknown as Array<{
    _id: mongoose.Types.ObjectId | string;
    title: string;
    url: string;
    description?: string;
    summary?: string;
    tags?: string[];
    ogImage?: string;
    isFavorite?: boolean;
    isReadLater?: boolean;
    createdAt: Date | string;
  }>;

  const bookmarks: BookmarkListItem[] = rawBookmarks.map((bookmark) => ({
    _id: bookmark._id.toString(),
    title: bookmark.title,
    url: bookmark.url,
    description: bookmark.description,
    summary: bookmark.summary,
    tags: bookmark.tags ?? [],
    ogImage: bookmark.ogImage,
    isFavorite: Boolean(bookmark.isFavorite),
    isReadLater: Boolean(bookmark.isReadLater),
    createdAt: bookmark.createdAt,
  }));
  
  // Get all tags for tags filter
  const tags = await getUserTags(session.user.id);

  // Get all folders for folder filter selector
  const rawFolders = await Folder.find({ userId: session.user.id })
    .sort({ name: 1 })
    .lean() as unknown as Array<{ _id: any; name: string }>;

  const folders = rawFolders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
  }));

  // Fetch compactMode preference
  const dbUser = await User.findById(session.user.id).select("preferences").lean() as any;
  const userPrefs = parsePreferences(dbUser?.preferences);
  const compactMode = userPrefs.compactMode;

  const pageTitle = status === "favorite" || searchParams.filter === "favorite"
    ? "Favorite Bookmarks"
    : status === "readlater" || searchParams.filter === "readlater"
    ? "Read Later"
    : "All Bookmarks";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {pageTitle}
        </h1>
        <Link href="/dashboard/bookmarks/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Bookmark
          </Button>
        </Link>
      </div>
      
      <AdvancedFilters 
        tags={tags}
        folders={folders}
      />
      
      {bookmarks.length > 0 ? (
        <>
          <BookmarkGrid bookmarks={bookmarks} compact={compactMode} />
          
          {/* Pagination */}
          {total > limit && (
            <div className="mt-8 flex justify-center">
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={{
                      pathname: "/dashboard/bookmarks",
                      query: {
                        ...searchParams,
                        page: page - 1,
                      },
                    }}
                  >
                    <Button variant="outline">Previous</Button>
                  </Link>
                )}
                
                <span className="flex h-10 items-center justify-center px-4 font-semibold text-sm">
                  Page {page} of {Math.ceil(total / limit)}
                </span>
                
                {page < Math.ceil(total / limit) && (
                  <Link
                    href={{
                      pathname: "/dashboard/bookmarks",
                      query: {
                        ...searchParams,
                        page: page + 1,
                      },
                    }}
                  >
                    <Button variant="outline">Next</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center bg-card">
          <p className="mb-4 text-muted-foreground font-semibold">
            {search
              ? `No bookmarks found for "${search}"`
              : tag
              ? `No bookmarks found with tag "${tag}"`
              : status || searchParams.filter
              ? `No bookmarks matching filter found`
              : "You don't have any bookmarks yet"}
          </p>
          <Link href="/dashboard/bookmarks/new">
            <Button>Add your first bookmark</Button>
          </Link>
        </div>
      )}
    </div>
  );
} 