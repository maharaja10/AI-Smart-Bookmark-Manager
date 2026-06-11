"use client";

import Link from "next/link";
import { Edit, Trash, FolderOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

type FolderWithCount = {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  userId: string;
  parentId?: string | null;
  isPublic: boolean;
  publicId?: string;
  bookmarkCount: number;
  createdAt?: string;
  updatedAt?: string;
};

type FolderGridProps = {
  folders: FolderWithCount[];
};

export default function FolderGrid({ folders }: FolderGridProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const deleteFolder = async (id: string, bookmarkCount: number) => {
    if (bookmarkCount > 0) {
      toast.error(`Cannot delete folder with ${bookmarkCount} bookmarks`);
      return;
    }

    if (!confirm("Are you sure you want to delete this folder?")) {
      return;
    }

    setIsLoading(id);

    try {
      const response = await fetch(`/api/folders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete folder");
      }

      toast.success("Folder deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete folder");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <>
      {folders.map((folder) => (
        <div
          key={`${folder._id.toString()}-${folder.color}`}
          className="flex flex-col rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <Link href={`/dashboard/bookmarks?folder=${folder._id}`}>
            <div 
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: folder.color }}
            >
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">{folder.name}</h2>
          </Link>
          
          {folder.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {folder.description}
            </p>
          )}
          
          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="text-sm">
              {folder.bookmarkCount}{" "}
              {folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}
            </span>
            
            <div className="flex gap-1">
              <Link
                href={`/dashboard/folders/${folder._id}/edit`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Edit className="h-4 w-4" />
              </Link>
              <button
                onClick={() => deleteFolder(folder._id.toString(), folder.bookmarkCount)}
                disabled={isLoading === folder._id.toString() || folder.bookmarkCount > 0}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  folder.bookmarkCount > 0
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                }`}
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
} 