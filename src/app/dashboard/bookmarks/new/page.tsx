"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { fetchUrlMetadata } from "@/lib/metadata";

interface FolderOption {
  _id: string;
  name: string;
}

interface FormData {
  title: string;
  url: string;
  description: string;
  tags: string;
  folderId: string;
  isPublic: boolean;
}

export default function NewBookmarkPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: "",
      url: "",
      description: "",
      tags: "",
      folderId: "",
      isPublic: false,
    },
  });
  
  const url = watch("url");
  
  // Fetch folders
  useEffect(() => {
    async function fetchFolders() {
      try {
        const response = await fetch("/api/folders");
        if (response.ok) {
          const data = await response.json();
          setFolders(data.folders || []);
        }
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    }
    
    fetchFolders();
  }, []);
  
  // Auto-fetch metadata when URL changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!url || url.length < 10 || !url.startsWith("http")) {
        return;
      }
      
      setIsFetchingMetadata(true);
      
      try {
        const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
        
        if (response.ok) {
          const metadata = await response.json();
          
          if (metadata.title && !watch("title")) {
            setValue("title", metadata.title);
          }
          
          if (metadata.description && !watch("description")) {
            setValue("description", metadata.description);
          }
        }
      } catch (error) {
        console.error("Error fetching metadata:", error);
      } finally {
        setIsFetchingMetadata(false);
      }
    };
    
    const timer = setTimeout(fetchMetadata, 500);
    return () => clearTimeout(timer);
  }, [url, setValue, watch]);
  
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      // Convert comma-separated tags to array
      const tagsArray = data.tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);
      
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          url: data.url,
          description: data.description,
          tags: tagsArray,
          folderId: data.folderId || null,
          isPublic: data.isPublic,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Failed to create bookmark");
      }
      
      toast.success("Bookmark created successfully!");
      router.push("/dashboard/bookmarks");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create bookmark");
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/bookmarks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Add New Bookmark</h1>
      </div>
      
      <div className="rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="url" className="text-sm font-medium">
              URL *
            </label>
            <div className="relative">
              <input
                id="url"
                type="url"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                  errors.url ? "border-destructive" : ""
                }`}
                placeholder="https://example.com"
                {...register("url", {
                  required: "URL is required",
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: "Please enter a valid URL starting with http:// or https://",
                  },
                })}
              />
              {isFetchingMetadata && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {errors.url && (
              <p className="text-xs text-destructive">{errors.url.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <label htmlFor="title" className="text-sm font-medium">
              Title *
            </label>
            <input
              id="title"
              type="text"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                errors.title ? "border-destructive" : ""
              }`}
              placeholder="Bookmark title"
              {...register("title", {
                required: "Title is required",
                maxLength: {
                  value: 200,
                  message: "Title cannot be more than 200 characters",
                },
              })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              rows={3}
              placeholder="Optional description"
              {...register("description", {
                maxLength: {
                  value: 1000,
                  message: "Description cannot be more than 1000 characters",
                },
              })}
            ></textarea>
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
          
          <div className="space-y-1">
            <label htmlFor="tags" className="text-sm font-medium">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Enter tags separated by commas (e.g., tech, news, tutorial)"
              {...register("tags")}
            />
            <p className="text-xs text-muted-foreground">
              Enter tags separated by commas
            </p>
          </div>
          
          <div className="space-y-1">
            <label htmlFor="folderId" className="text-sm font-medium">
              Folder
            </label>
            <select
              id="folderId"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...register("folderId")}
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder._id} value={folder._id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              id="isPublic"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              {...register("isPublic")}
            />
            <label htmlFor="isPublic" className="text-sm font-medium">
              Make this bookmark public
            </label>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Link href="/dashboard/bookmarks">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Bookmark"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 