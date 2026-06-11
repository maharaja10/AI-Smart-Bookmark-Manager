"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  FolderTree,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Suggestion {
  bookmarkId: string;
  title: string;
  currentFolder: string | null;
  suggestedFolder: string;
  confidence: number;
}

export default function OrganizePage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<"analyzing" | "generating" | "applying" | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analyze bookmarks (GET API)
  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStep("analyzing");

    try {
      // Step 1: Simulate/set analyzing step
      await new Promise((resolve) => setTimeout(resolve, 800));
      setLoadingStep("generating");

      // Step 2: Fetch suggested categories
      const response = await fetch("/api/folders/organize");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to fetch folder suggestions.");
      }

      const data = (await response.json()) as Suggestion[];
      setSuggestions(data);
      setHasRun(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to analyze bookmarks.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  // Apply organization changes (POST API)
  const handleApply = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStep("applying");

    try {
      const response = await fetch("/api/folders/organize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to apply folder organization.");
      }

      const result = (await response.json()) as { updated: number; foldersCreated: number };
      
      toast.success(
        `Successfully organized:\n• ${result.updated} bookmarks moved\n• ${result.foldersCreated} folders created`
      );
      
      // Clear suggestions and refresh
      setSuggestions([]);
      setHasRun(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to apply folder organization.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  // Compute stats for summary card
  const totalAnalyzed = suggestions.length;
  const suggestedMoves = suggestions.filter(
    (s) => s.currentFolder?.toLowerCase().trim() !== s.suggestedFolder.toLowerCase().trim()
  ).length;

  const existingFolderNames = new Set(
    suggestions
      .map((s) => s.currentFolder)
      .filter((name): name is string => name !== null)
  );

  const foldersToCreate = new Set(
    suggestions
      .map((s) => s.suggestedFolder)
      .filter((name) => name !== "Other" && !existingFolderNames.has(name))
  );
  const foldersToCreateCount = foldersToCreate.size;

  // Determine helper text based on loading step
  const getLoadingMessage = () => {
    switch (loadingStep) {
      case "analyzing":
        return "Analyzing bookmarks...";
      case "generating":
        return "Generating folder suggestions...";
      case "applying":
        return "Applying organization...";
      default:
        return "Processing...";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderTree className="h-8 w-8 text-primary" />
            AI Folder Organizer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically organize bookmarks into intelligent folders.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            variant={hasRun ? "outline" : "default"}
            className="w-full md:w-auto"
          >
            {isLoading && loadingStep !== "applying" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {hasRun ? "Re-Analyze Bookmarks" : "Analyze Bookmarks"}
              </>
            )}
          </Button>

          {hasRun && suggestions.length > 0 && (
            <Button
              onClick={handleApply}
              disabled={isLoading || suggestedMoves === 0}
              className="w-full md:w-auto"
            >
              {isLoading && loadingStep === "applying" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Changes"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center bg-card shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h3 className="text-lg font-semibold text-foreground">{getLoadingMessage()}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This may take a few seconds depending on your bookmarks count.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <h3 className="font-semibold">Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Initial state (Not Run) */}
      {!hasRun && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center bg-card shadow-sm">
          <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Ready to Organize</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Click &quot;Analyze Bookmarks&quot; to inspect suggestions for grouping your bookmark collection into organized folders.
          </p>
          <Button onClick={handleAnalyze} className="mt-4">
            <Sparkles className="mr-2 h-4 w-4" />
            Analyze Bookmarks
          </Button>
        </div>
      )}

      {/* Empty State */}
      {hasRun && !isLoading && suggestions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center bg-card shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
          <h3 className="text-lg font-semibold">No Bookmarks Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You don&apos;t have any bookmarks to analyze yet.
          </p>
        </div>
      )}

      {/* Results View */}
      {hasRun && !isLoading && suggestions.length > 0 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
              <div className="text-2xl font-bold">{totalAnalyzed}</div>
              <p className="text-sm text-muted-foreground">Total Bookmarks Analyzed</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
              <div className="text-2xl font-bold text-primary">{suggestedMoves}</div>
              <p className="text-sm text-muted-foreground">Suggested Moves</p>
            </div>
            <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
              <div className="text-2xl font-bold text-secondary-foreground">{foldersToCreateCount}</div>
              <p className="text-sm text-muted-foreground">Folders to Create</p>
            </div>
          </div>

          {/* Suggested Moves Notice */}
          {suggestedMoves === 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="font-semibold">All Bookmarks Organized</h3>
                <p className="text-sm">
                  All your bookmarks are already in folders that match their content classification! No suggestions to apply.
                </p>
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 font-medium text-muted-foreground">
                    <th className="px-6 py-3 font-semibold">Bookmark</th>
                    <th className="px-6 py-3 font-semibold">Current Folder</th>
                    <th className="px-6 py-3 font-semibold"></th>
                    <th className="px-6 py-3 font-semibold">Suggested Folder</th>
                    <th className="px-6 py-3 font-semibold">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {suggestions.map((s) => {
                    const isChanged = s.currentFolder?.toLowerCase().trim() !== s.suggestedFolder.toLowerCase().trim();
                    
                    // Confidence Color Classes
                    let badgeClass = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-300";
                    if (s.confidence >= 90) {
                      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50";
                    } else if (s.confidence >= 75) {
                      badgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50";
                    }

                    return (
                      <tr
                        key={s.bookmarkId}
                        className={`transition-colors hover:bg-muted/30 ${
                          isChanged ? "bg-primary/[0.01]" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground max-w-[300px] truncate md:max-w-md">
                            {s.title}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {s.currentFolder ? (
                            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground border">
                              {s.currentFolder}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">None</span>
                          )}
                        </td>
                        <td className="px-2 py-4 text-center">
                          {isChanged && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                            isChanged ? "border-primary/20 bg-primary/5 text-primary" : "bg-secondary text-secondary-foreground"
                          }`}>
                            {s.suggestedFolder}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                            {s.confidence}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
