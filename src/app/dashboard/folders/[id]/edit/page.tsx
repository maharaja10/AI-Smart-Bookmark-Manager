"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface FormData {
  name: string;
  description: string;
  color: string;
  isPublic: boolean;
}

export default function EditFolderPage() {
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      color: "#3b82f6",
      isPublic: false,
    },
  });
  
  // Watch the color field for debugging
  const currentColor = watch("color");
  
  // Fetch folder data
  useEffect(() => {
    const fetchFolder = async () => {
      try {
        const response = await fetch(`/api/folders/${folderId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch folder");
        }
        
        const folder = await response.json();
        setDebugInfo(folder);
        
        reset({
          name: folder.name,
          description: folder.description || "",
          color: folder.color || "#3b82f6",
          isPublic: folder.isPublic || false,
        });
      } catch (error) {
        toast.error("Failed to load folder data");
        router.push("/dashboard/folders");
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchFolder();
  }, [folderId, reset, router]);
  
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      // Use fetch API directly with explicit headers
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          color: data.color,
          isPublic: data.isPublic
        }),
      });
      
      const result = await response.json();

      
      if (!response.ok) {
        throw new Error(result.message || "Failed to update folder");
      }
      
      toast.success("Folder updated successfully!");
      
      // Force a complete page refresh with cache busting
      const cacheBuster = new Date().getTime();
      window.location.href = `/dashboard/folders?t=${cacheBuster}`;
    } catch (error: any) {
      console.error("Error updating folder:", error);
      toast.error(error.message || "Failed to update folder");
      setIsLoading(false);
    }
  };
  
  if (isFetching) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/folders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Folder</h1>
      </div>
      
      {/* Debug information */}
      <div className="rounded-lg border bg-card p-4 text-xs">
        <p>Current color: {currentColor}</p>
        <p>Original folder color: {debugInfo?.color}</p>
      </div>
      
      <div className="rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Folder Name *
            </label>
            <input
              id="name"
              type="text"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${
                errors.name ? "border-destructive" : ""
              }`}
              placeholder="Work, Personal, etc."
              {...register("name", {
                required: "Folder name is required",
                maxLength: {
                  value: 100,
                  message: "Folder name cannot be more than 100 characters",
                },
              })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
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
                  value: 500,
                  message: "Description cannot be more than 500 characters",
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
            <label htmlFor="color" className="text-sm font-medium">
              Folder Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="color"
                type="color"
                className="h-10 w-10 cursor-pointer rounded-md border bg-background p-1"
                {...register("color")}
              />
              <input
                type="text"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                {...register("color", {
                  pattern: {
                    value: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
                    message: "Please enter a valid hex color",
                  },
                })}
              />
            </div>
            {errors.color && (
              <p className="text-xs text-destructive">{errors.color.message}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              id="isPublic"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              {...register("isPublic")}
            />
            <label htmlFor="isPublic" className="text-sm font-medium">
              Make this folder public
            </label>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Link href="/dashboard/folders">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Folder"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 