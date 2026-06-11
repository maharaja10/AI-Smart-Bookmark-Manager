"use client";

import { useEffect, useState } from "react";
import { Download, FileJson, FileSpreadsheet, Folder, Heart, Clock, Bookmark, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

interface FolderItem {
  _id: string;
  name: string;
}

export default function ExportPage() {
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [scope, setScope] = useState<"all" | "favorites" | "readlater" | "folder">("all");
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (scope === "folder") {
      setIsLoadingFolders(true);
      fetch("/api/folders")
        .then((res) => res.json())
        .then((data) => {
          const folderList = data.folders || [];
          setFolders(folderList);
          if (folderList.length > 0) {
            setSelectedFolderId(folderList[0]._id);
          }
        })
        .catch(() => {
          toast.error("Failed to load folders");
        })
        .finally(() => {
          setIsLoadingFolders(false);
        });
    }
  }, [scope]);

  const handleExport = () => {
    setIsExporting(true);
    try {
      let url = `/api/export?format=${format}&scope=${scope}`;
      if (scope === "folder") {
        if (!selectedFolderId) {
          toast.error("Please select a folder to export");
          setIsExporting(false);
          return;
        }
        url += `&folderId=${selectedFolderId}`;
      }

      // Simple browser download trigger
      window.location.href = url;
      toast.success("Export started");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Export Center</h1>
        <p className="text-muted-foreground">
          Backup your bookmark database, migrate your data, or export filtered sets of bookmarks.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left pane: Options */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">1. Choose Format</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormat("json")}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all ${
                    format === "json"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-accent border-border"
                  }`}
                >
                  <div className={`p-3 rounded-lg ${format === "json" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <FileJson className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">JSON Format</div>
                    <div className="text-xs text-muted-foreground mt-1">Recommended for backups</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("csv")}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all ${
                    format === "csv"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-accent border-border"
                  }`}
                >
                  <div className={`p-3 rounded-lg ${format === "csv" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">CSV Format</div>
                    <div className="text-xs text-muted-foreground mt-1">Best for spreadsheet software</div>
                  </div>
                </button>
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <h2 className="text-lg font-semibold mb-3">2. Export Scope</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="all"
                    checked={scope === "all"}
                    onChange={() => setScope("all")}
                    className="accent-primary"
                  />
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">All Bookmarks</span>
                    <p className="text-xs text-muted-foreground">Export every bookmark saved in your account</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="favorites"
                    checked={scope === "favorites"}
                    onChange={() => setScope("favorites")}
                    className="accent-primary"
                  />
                  <Heart className="h-4 w-4 text-rose-500" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Favorites Only</span>
                    <p className="text-xs text-muted-foreground">Export bookmarks that you have starred as favorite</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="readlater"
                    checked={scope === "readlater"}
                    onChange={() => setScope("readlater")}
                    className="accent-primary"
                  />
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Read Later Only</span>
                    <p className="text-xs text-muted-foreground">Export bookmarks set to Read Later status</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="folder"
                    checked={scope === "folder"}
                    onChange={() => setScope("folder")}
                    className="accent-primary"
                  />
                  <Folder className="h-4 w-4 text-amber-500" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Specific Folder</span>
                    <p className="text-xs text-muted-foreground">Export bookmarks belonging to a single folder</p>
                  </div>
                </label>

                {scope === "folder" && (
                  <div className="pl-7 pt-2">
                    {isLoadingFolders ? (
                      <div className="text-sm text-muted-foreground">Loading folders...</div>
                    ) : folders.length === 0 ? (
                      <div className="text-sm text-amber-600 dark:text-amber-400">
                        No folders found. Create folders before exporting folder-specific bookmarks.
                      </div>
                    ) : (
                      <select
                        value={selectedFolderId}
                        onChange={(e) => setSelectedFolderId(e.target.value)}
                        className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {folders.map((f) => (
                          <option key={f._id} value={f._id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right pane: summary & action */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <h3 className="font-semibold text-lg">Export Summary</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium uppercase">{format}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Scope</span>
                <span className="font-medium capitalize">{scope === "readlater" ? "Read Later" : scope}</span>
              </div>
              {scope === "folder" && selectedFolderId && (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Folder</span>
                  <span className="font-medium truncate max-w-[120px]">
                    {folders.find((f) => f._id === selectedFolderId)?.name || "Selected folder"}
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting || (scope === "folder" && !selectedFolderId)}
              className="w-full flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Download Export File"}
            </Button>
          </div>

          <div className="rounded-xl border bg-muted/40 p-4 text-xs space-y-2 text-muted-foreground">
            <h4 className="font-semibold text-card-foreground">Data Details:</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>JSON export contains full fields including description, summary, tag array, folder name, and state values.</li>
              <li>CSV export includes title, url, description, tags, folder, and flag columns.</li>
              <li>Passwords and sensitive login tokens are never stored in bookmarks and are excluded.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
