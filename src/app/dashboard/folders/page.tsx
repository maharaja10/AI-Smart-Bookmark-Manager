import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Folder from "@/models/Folder";
import Bookmark from "@/models/Bookmark";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FolderOpen, Bookmark as BookmarkIcon } from "lucide-react";
import FolderGrid from "@/components/dashboard/FolderGrid";
import mongoose from "mongoose";

// Prevent caching to ensure fresh data on each page load
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FoldersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Loading...</div>;
  }
  
  await connectDB();
  
  // Get folders
  const rawFolders = (await Folder.find({ userId: session.user.id })
    .sort({ name: 1 })
    .lean()) as unknown as Array<any>;
  
  // Get bookmark counts for each folder
  const folderCounts = await Bookmark.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(session.user.id) 
      } 
    },
    { 
      $group: { 
        _id: "$folderId", 
        count: { $sum: 1 } 
      } 
    },
  ]);
  
  // Map of folder ID to bookmark count
  const folderCountMap = folderCounts.reduce((acc, item) => {
    const key = item._id ? item._id.toString() : "null";
    acc[key] = item.count;
    return acc;
  }, {} as Record<string, number>);
  
  // Count bookmarks without a folder
  const unfolderedCount = folderCountMap["null"] || 0;
  
  // Serialize folders and add bookmark count
  const foldersWithCount = rawFolders.map((folder) => {
    const folderId = folder._id.toString();
    return {
      _id: folderId,
      name: folder.name,
      description: folder.description || "",
      color: folder.color || "#3b82f6",
      icon: folder.icon || "folder",
      userId: String(folder.userId),
      parentId: folder.parentId ? String(folder.parentId) : null,
      isPublic: folder.isPublic || false,
      publicId: folder.publicId || "",
      bookmarkCount: folderCountMap[folderId] || 0,
      createdAt: folder.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: folder.updatedAt?.toISOString() || new Date().toISOString(),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Folders</h1>
        <Link href="/dashboard/folders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Unfoldered bookmarks card */}
        <Link
          href="/dashboard/bookmarks?folder=null"
          className="flex flex-col rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <BookmarkIcon className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Unfiled Bookmarks</h2>
          <p className="text-sm text-muted-foreground">
            Bookmarks not in any folder
          </p>
          <div className="mt-auto pt-4 text-sm">
            {unfolderedCount} {unfolderedCount === 1 ? "bookmark" : "bookmarks"}
          </div>
        </Link>
        
        {/* Folder grid */}
        {foldersWithCount.length > 0 ? (
          <FolderGrid folders={foldersWithCount} />
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <p className="mb-4 text-muted-foreground">
              You don&apos;t have any folders yet
            </p>
            <Link href="/dashboard/folders/new">
              <Button>Create your first folder</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 