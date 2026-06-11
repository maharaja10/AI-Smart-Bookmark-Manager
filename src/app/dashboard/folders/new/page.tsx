"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { generateRandomColor } from "@/lib/utils";

interface FormData {
  name: string;
  description: string;
  color: string;
  isPublic: boolean;
}

export default function NewFolderPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      color: generateRandomColor(),
      isPublic: false,
    },
  });
  
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Failed to create folder");
      }
      
      toast.success("Folder created successfully!");
      router.push("/dashboard/folders");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create folder");
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/folders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Create New Folder</h1>
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
                  Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 