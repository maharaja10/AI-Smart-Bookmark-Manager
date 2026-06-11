import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import BookmarkVersion from "@/models/BookmarkVersion";
import BookmarkDetailTabs from "@/components/bookmarks/BookmarkDetailTabs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Heart, Clock, Edit } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import mongoose from "mongoose";

interface BookmarkPageProps {
  params: {
    id: string;
  };
}

export default async function BookmarkPage({ params }: BookmarkPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Loading...</div>;
  }
  
  // Check if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(params.id)) {
    notFound();
  }
  
  await connectDB();
  
  // Get bookmark
  const rawBookmark = (await Bookmark.findOne({
    _id: params.id,
    userId: session.user.id,
  }).lean()) as any;
  
  let isDeleted = false;
  let bookmarkTitle = "";
  let bookmarkUrl = "";
  let bookmark = null;

  if (!rawBookmark) {
    // Check if version history exists for this ID to allow viewing of history for deleted bookmarks
    const latestVersion = await BookmarkVersion.findOne({
      bookmarkId: params.id,
      userId: session.user.id,
    })
      .sort({ versionNumber: -1 })
      .select("snapshot")
      .lean() as any;

    if (!latestVersion) {
      notFound();
    }
    
    isDeleted = true;
    bookmarkTitle = latestVersion.snapshot.title || "Deleted Bookmark";
    bookmarkUrl = latestVersion.snapshot.url || "";
  } else {
    bookmark = {
      _id: String(rawBookmark._id),
      title: rawBookmark.title,
      url: rawBookmark.url,
      description: rawBookmark.description || "",
      summary: rawBookmark.summary || "",
      tags: rawBookmark.tags || [],
      folderId: rawBookmark.folderId ? String(rawBookmark.folderId) : null,
      favicon: rawBookmark.favicon || "",
      ogImage: rawBookmark.ogImage || "",
      ogTitle: rawBookmark.ogTitle || "",
      ogDescription: rawBookmark.ogDescription || "",
      isFavorite: Boolean(rawBookmark.isFavorite),
      isReadLater: Boolean(rawBookmark.isReadLater),
      isPublic: Boolean(rawBookmark.isPublic),
      visitCount: rawBookmark.visitCount || 0,
      lastVisited: rawBookmark.lastVisited?.toISOString() || null,
      createdAt: rawBookmark.createdAt?.toISOString() || new Date().toISOString(),
    };
    bookmarkTitle = bookmark.title;
    bookmarkUrl = bookmark.url;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/bookmarks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className={`text-2xl font-bold ${isDeleted ? "text-muted-foreground line-through decoration-red-500/50" : ""}`}>
            {bookmarkTitle}
          </h1>
        </div>
        
        {!isDeleted && bookmark && (
          <div className="flex items-center gap-2">
            <Link href={bookmark.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Visit
              </Button>
            </Link>
            <Link href={`/dashboard/bookmarks/${bookmark._id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      <BookmarkDetailTabs bookmarkId={params.id} isDeleted={isDeleted}>
        {bookmark && (
          <div className="rounded-lg border bg-card overflow-hidden">
            {bookmark.ogImage && (
              <div className="relative h-64 w-full">
                <Image
                  src={bookmark.ogImage}
                  alt={bookmark.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            )}
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{bookmark.title}</h2>
                <div className="flex gap-2">
                  {bookmark.isFavorite && (
                    <div className="flex items-center gap-1 text-sm text-red-500">
                      <Heart className="h-4 w-4 fill-current" />
                      Favorite
                    </div>
                  )}
                  {bookmark.isReadLater && (
                    <div className="flex items-center gap-1 text-sm text-blue-500">
                      <Clock className="h-4 w-4" />
                      Read Later
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <a 
                  href={bookmark.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {bookmark.url}
                </a>
              </div>

              {bookmark.summary && (
                <div className="py-2">
                  <h3 className="text-sm font-medium mb-1">Summary</h3>
                  <p className="text-sm text-muted-foreground">{bookmark.summary}</p>
                </div>
              )}
              
              {bookmark.description && (
                <div className="py-2">
                  <h3 className="text-sm font-medium mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground">{bookmark.description}</p>
                </div>
              )}
              
              {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="py-2">
                  <h3 className="text-sm font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {bookmark.tags.map((tag: string) => (
                      <Link
                        key={tag}
                        href={`/dashboard/bookmarks?tag=${encodeURIComponent(tag)}`}
                        className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4 flex items-center justify-between text-sm text-muted-foreground">
                <div>Added on {formatDate(bookmark.createdAt)}</div>
                {bookmark.visitCount > 0 && (
                  <div>Visited {bookmark.visitCount} times</div>
                )}
              </div>
            </div>
          </div>
        )}
      </BookmarkDetailTabs>
    </div>
  );
} 