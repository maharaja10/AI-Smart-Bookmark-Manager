"use client";

import { formatDate, getDomainFromUrl } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Heart, Clock, Edit, Trash, ExternalLink, CheckCircle2, Bookmark } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export type BookmarkListItem = {
  _id: string;
  title: string;
  url: string;
  description?: string;
  summary?: string;
  tags: string[];
  ogImage?: string;
  isFavorite: boolean;
  isReadLater: boolean;
  isRead?: boolean;
  createdAt: Date | string;
};

type BookmarkGridProps = {
  bookmarks: BookmarkListItem[];
  compact?: boolean;
};

export default function BookmarkGrid({ bookmarks, compact = false }: BookmarkGridProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    setIsLoading(id);
    try {
      const response = await fetch(`/api/bookmarks/${id}/favorite`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isFavorite: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update bookmark");
      }

      toast.success(currentStatus ? "Removed from favorites" : "Added to favorites");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update bookmark");
    } finally {
      setIsLoading(null);
    }
  };

  const toggleReadLater = async (id: string, currentStatus: boolean) => {
    setIsLoading(id);
    try {
      const response = await fetch(`/api/bookmarks/${id}/readlater`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isReadLater: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update bookmark");
      }

      toast.success(currentStatus ? "Removed from read later" : "Added to read later");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update bookmark");
    } finally {
      setIsLoading(null);
    }
  };

  const toggleRead = async (id: string, currentStatus: boolean) => {
    setIsLoading(id);
    try {
      const response = await fetch(`/api/bookmarks/${id}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update bookmark read status");
      }

      toast.success(currentStatus ? "Marked as unread" : "Marked as read");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update bookmark read status");
    } finally {
      setIsLoading(null);
    }
  };

  const deleteBookmark = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bookmark?")) {
      return;
    }

    setIsLoading(id);
    try {
      const response = await fetch(`/api/bookmarks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete bookmark");
      }

      toast.success("Bookmark deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete bookmark");
    } finally {
      setIsLoading(null);
    }
  };

  const visitBookmark = async (id: string, url: string) => {
    fetch(`/api/bookmarks/${id}/visit`, {
      method: "POST",
    }).catch(console.error);
    window.open(url, "_blank");
  };

  return (
    <div className={compact ? "space-y-2" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
      {bookmarks.map((bookmark) => {
        const idStr = bookmark._id.toString();

        if (compact) {
          return (
            <div
              key={idStr}
              className="group flex items-center justify-between border bg-card hover:bg-accent/10 px-4 py-2.5 rounded-lg shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 shrink-0">
                  {bookmark.isFavorite && (
                    <Heart className="h-3.5 w-3.5 text-red-500" fill="currentColor" />
                  )}
                  {bookmark.isReadLater && (
                    <Clock className="h-3.5 w-3.5 text-blue-500" fill="currentColor" />
                  )}
                  {!bookmark.isFavorite && !bookmark.isReadLater && (
                    <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
                    <h4 className="font-semibold text-sm truncate max-w-[250px] sm:max-w-[400px]">
                      <Link
                        href={`/dashboard/bookmarks/${bookmark._id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {bookmark.title}
                      </Link>
                    </h4>
                    <span className="text-[10px] text-muted-foreground truncate shrink-0">
                      ({getDomainFromUrl(bookmark.url)})
                    </span>
                  </div>
                  {bookmark.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-[250px] sm:max-w-[500px]">
                      {bookmark.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {bookmark.tags && bookmark.tags.length > 0 && (
                  <div className="hidden lg:flex gap-1">
                    {bookmark.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {formatDate(bookmark.createdAt)}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => visitBookmark(idStr, bookmark.url)}
                    className="p-1 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Visit Website"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleFavorite(idStr, bookmark.isFavorite)}
                    disabled={isLoading === idStr}
                    className={`p-1 rounded-full ${bookmark.isFavorite ? "text-red-500" : "text-muted-foreground"} hover:bg-muted`}
                    title={bookmark.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Heart className="h-3.5 w-3.5" fill={bookmark.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => toggleReadLater(idStr, bookmark.isReadLater)}
                    disabled={isLoading === idStr}
                    className={`p-1 rounded-full ${bookmark.isReadLater ? "text-blue-500" : "text-muted-foreground"} hover:bg-muted`}
                    title={bookmark.isReadLater ? "Remove from Read Later" : "Add to Read Later"}
                  >
                    <Clock className="h-3.5 w-3.5" fill={bookmark.isReadLater ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => toggleRead(idStr, Boolean(bookmark.isRead))}
                    disabled={isLoading === idStr}
                    className={`p-1 rounded-full ${bookmark.isRead ? "text-emerald-500" : "text-muted-foreground"} hover:bg-muted`}
                    title={bookmark.isRead ? "Mark as Unread" : "Mark as Read"}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" fill={bookmark.isRead ? "currentColor" : "none"} />
                  </button>
                  <Link
                    href={`/dashboard/bookmarks/${bookmark._id}/edit`}
                    className="p-1 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => deleteBookmark(idStr)}
                    disabled={isLoading === idStr}
                    className="p-1 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={idStr}
            className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md"
          >
            <div className="relative h-32 w-full overflow-hidden bg-muted">
              {bookmark.ogImage ? (
                <Image
                  src={bookmark.ogImage}
                  alt={bookmark.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary">
                  <span className="text-lg font-medium text-secondary-foreground">
                    {getDomainFromUrl(bookmark.url)}
                  </span>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => visitBookmark(idStr, bookmark.url)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                    aria-label="Visit website"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleFavorite(idStr, bookmark.isFavorite)}
                    disabled={isLoading === idStr}
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      bookmark.isFavorite ? "bg-red-500 text-white" : "bg-white/20 text-white"
                    } hover:bg-white/30`}
                    aria-label={bookmark.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart className="h-4 w-4" fill={bookmark.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => toggleReadLater(idStr, bookmark.isReadLater)}
                    disabled={isLoading === idStr}
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      bookmark.isReadLater ? "bg-blue-500 text-white" : "bg-white/20 text-white"
                    } hover:bg-white/30`}
                    aria-label={bookmark.isReadLater ? "Remove from read later" : "Add to read later"}
                  >
                    <Clock className="h-4 w-4" fill={bookmark.isReadLater ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => toggleRead(idStr, Boolean(bookmark.isRead))}
                    disabled={isLoading === idStr}
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      bookmark.isRead ? "bg-emerald-500 text-white" : "bg-white/20 text-white"
                    } hover:bg-white/30`}
                    aria-label={bookmark.isRead ? "Mark as unread" : "Mark as read"}
                  >
                    <CheckCircle2 className="h-4 w-4" fill={bookmark.isRead ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="mb-2 flex items-start justify-between">
                <h3 className="font-medium line-clamp-2">
                  <Link
                    href={`/dashboard/bookmarks/${bookmark._id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {bookmark.title}
                  </Link>
                </h3>
                <div className="flex gap-1">
                  <Link
                    href={`/dashboard/bookmarks/${bookmark._id}/edit`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Edit className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={() => deleteBookmark(idStr)}
                    disabled={isLoading === idStr}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <p className="mb-2 text-xs text-muted-foreground">
                {getDomainFromUrl(bookmark.url)}
              </p>

              {(bookmark.summary || bookmark.description) && (
                <p className="mb-3 text-sm text-muted-foreground line-clamp-3">
                  {bookmark.summary || bookmark.description}
                </p>
              )}

              {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {bookmark.tags.slice(0, 3).map((tag) => (
                    <Link
                      key={tag}
                      href={`/dashboard/bookmarks?tag=${encodeURIComponent(tag)}`}
                      className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground hover:bg-secondary/80"
                    >
                      {tag}
                    </Link>
                  ))}
                  {bookmark.tags.length > 3 && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      +{bookmark.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(bookmark.createdAt)}</span>
                <div className="flex items-center gap-2">
                  {bookmark.isFavorite && (
                    <Heart className="h-3 w-3 text-red-500" fill="currentColor" />
                  )}
                  {bookmark.isReadLater && (
                    <Clock className="h-3 w-3 text-blue-500" fill="currentColor" />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}