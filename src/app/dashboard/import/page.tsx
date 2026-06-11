"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileCode, CheckCircle2, AlertCircle, FileSpreadsheet, Globe, Eye, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

interface ParsedBookmark {
  title: string;
  url: string;
  description?: string;
  tags?: string[];
  folder?: string;
  isFavorite?: boolean;
  isReadLater?: boolean;
}

interface ImportSummary {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"json" | "csv" | "html" | null>(null);
  const [parsedBookmarks, setParsedBookmarks] = useState<ParsedBookmark[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV helper (RFC 4180-ish)
  const parseCsvData = (text: string): ParsedBookmark[] => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (insideQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentField += '"';
            i++; // skip next quote
          } else {
            insideQuotes = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          insideQuotes = true;
        } else if (char === ",") {
          currentLine.push(currentField.trim());
          currentField = "";
        } else if (char === "\n" || char === "\r") {
          if (char === "\r" && nextChar === "\n") {
            i++; // skip \n
          }
          currentLine.push(currentField.trim());
          lines.push(currentLine);
          currentLine = [];
          currentField = "";
        } else {
          currentField += char;
        }
      }
    }
    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      lines.push(currentLine);
    }

    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.toLowerCase().trim().replace(/['"]/g, ''));
    const results: ParsedBookmark[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length < headers.length) continue;

      const bookmark: any = {};
      headers.forEach((header, index) => {
        let value: any = row[index];
        if (header === "tags") {
          value = value ? value.split(/[|,]/).map((t: string) => t.trim()).filter(Boolean) : [];
        } else if (header === "isfavorite" || header === "isreadlater" || header === "isread") {
          value = value === "true" || value === "1" || value === "yes";
        }
        bookmark[header] = value;
      });

      // Map dynamic header fields to expected structure
      const url = bookmark.url || bookmark.href || bookmark.link;
      const title = bookmark.title || bookmark.name || url;
      const folder = bookmark.folder || bookmark.directory || bookmark.category || "";
      const description = bookmark.description || bookmark.desc || bookmark.summary || "";
      const isFavorite = bookmark.isfavorite || bookmark.favorite || bookmark.starred || false;
      const isReadLater = bookmark.isreadlater || bookmark.readlater || bookmark.later || false;

      if (url) {
        results.push({
          title,
          url,
          description,
          tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
          folder: typeof folder === "string" ? folder : "",
          isFavorite: Boolean(isFavorite),
          isReadLater: Boolean(isReadLater),
        });
      }
    }

    return results;
  };

  // Parse Netscape HTML helper
  const parseNetscapeHtmlData = (html: string): ParsedBookmark[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const results: ParsedBookmark[] = [];

    function getParentFolderName(aNode: Element): string | null {
      let parent = aNode.parentElement;
      while (parent) {
        if (parent.tagName === "DL") {
          const dt = parent.parentElement;
          if (dt && dt.tagName === "DT") {
            const h3 = dt.querySelector("h3");
            if (h3) {
              return h3.textContent || null;
            }
          }
        }
        parent = parent.parentElement;
      }
      return null;
    }

    const links = doc.querySelectorAll("a");
    links.forEach((link) => {
      const url = link.getAttribute("href");
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        const folderName = getParentFolderName(link);
        const tagsStr = link.getAttribute("tags");
        const tags = tagsStr ? tagsStr.split(/[|,]/).map(t => t.trim()).filter(Boolean) : [];
        
        results.push({
          title: link.textContent || url,
          url: url,
          folder: folderName || undefined,
          tags: tags,
          description: "Imported from browser bookmarks",
        });
      }
    });

    return results;
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setImportSummary(null);
    setIsParsing(true);

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        let bookmarks: ParsedBookmark[] = [];
        if (extension === "json") {
          setFileType("json");
          const parsedJson = JSON.parse(content);
          bookmarks = Array.isArray(parsedJson) 
            ? parsedJson 
            : (parsedJson.bookmarks || []);
        } else if (extension === "csv") {
          setFileType("csv");
          bookmarks = parseCsvData(content);
        } else if (extension === "html" || extension === "htm") {
          setFileType("html");
          bookmarks = parseNetscapeHtmlData(content);
        } else {
          toast.error("Unsupported file extension. Please select JSON, CSV, or HTML file.");
          setFile(null);
          setIsParsing(false);
          return;
        }

        setParsedBookmarks(bookmarks);
        if (bookmarks.length === 0) {
          toast("No valid bookmarks were found in the file.", { icon: "⚠️" });
        } else {
          toast.success(`Found ${bookmarks.length} bookmarks to import!`);
        }
      } catch (err) {
        toast.error("Error parsing file. Ensure the format is correct.");
        setFile(null);
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsText(selectedFile);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleImportSubmit = async () => {
    if (parsedBookmarks.length === 0) return;
    
    setIsImporting(true);
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookmarks: parsedBookmarks,
          skipDuplicates,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to import bookmarks");
      }

      setImportSummary({
        imported: data.imported || 0,
        skipped: data.skipped || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });
      toast.success("Bookmarks imported successfully!");
      setFile(null);
      setParsedBookmarks([]);
    } catch (error: any) {
      toast.error(error.message || "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Import Center</h1>
        <p className="text-muted-foreground">
          Import bookmarks from another manager, backups, or Chrome/Edge/Firefox exports.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* File Upload Area */}
          <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 text-center bg-card hover:bg-accent/10 transition-colors cursor-pointer space-y-4"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileInputChange}
              accept=".json,.csv,.html,.htm"
              className="hidden"
            />
            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-full">
              <Upload className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">Drag & drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports JSON backups, CSV sheets, and Chrome/Edge HTML files</p>
            </div>
          </div>

          {/* Import Settings */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold">Settings</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4 accent-primary"
              />
              <div>
                <span className="text-sm font-medium">Skip Duplicate Bookmarks</span>
                <p className="text-xs text-muted-foreground">If a bookmark URL already exists in your account, it will be skipped</p>
              </div>
            </label>
          </div>

          {/* Import Preview */}
          {isParsing ? (
            <div className="flex items-center justify-center gap-2 p-12 border rounded-xl bg-card">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Parsing file contents...</span>
            </div>
          ) : parsedBookmarks.length > 0 ? (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">File Preview ({parsedBookmarks.length} found)</h3>
                </div>
                <span className="text-xs uppercase px-2 py-0.5 font-semibold bg-primary/10 text-primary rounded-full">
                  {fileType} format
                </span>
              </div>
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {parsedBookmarks.slice(0, 10).map((b, i) => (
                  <div key={i} className="p-3 text-sm flex flex-col gap-1">
                    <div className="font-semibold truncate">{b.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.url}</div>
                    {b.folder && (
                      <div className="flex gap-1 mt-1 text-xs">
                        <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-medium">
                          Folder: {b.folder}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {parsedBookmarks.length > 10 && (
                  <div className="p-3 text-xs text-center text-muted-foreground bg-muted/20">
                    Showing first 10 of {parsedBookmarks.length} bookmarks
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-6">
            <h3 className="font-semibold text-lg">Action</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">
                  {file ? "File Selected" : "Awaiting File"}
                </span>
              </div>
              {file && (
                <>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium truncate max-w-[120px]">{file.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Total Parsed</span>
                    <span className="font-medium">{parsedBookmarks.length}</span>
                  </div>
                </>
              )}
            </div>

            <Button
              onClick={handleImportSubmit}
              disabled={isImporting || parsedBookmarks.length === 0}
              className="w-full flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Run Import Now
                </>
              )}
            </Button>
          </div>

          {/* Import Summary Report */}
          {importSummary && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Import Report
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded">
                  <div>{importSummary.imported}</div>
                  <div className="text-[10px] uppercase text-muted-foreground mt-0.5">Imported</div>
                </div>
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded">
                  <div>{importSummary.skipped}</div>
                  <div className="text-[10px] uppercase text-muted-foreground mt-0.5">Skipped</div>
                </div>
                <div className="p-2 bg-rose-500/10 text-rose-500 rounded">
                  <div>{importSummary.failed}</div>
                  <div className="text-[10px] uppercase text-muted-foreground mt-0.5">Failed</div>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Failed Items:
                  </div>
                  <div className="max-h-[100px] overflow-y-auto text-[11px] text-muted-foreground divide-y border rounded bg-muted/40 p-2">
                    {importSummary.errors.slice(0, 20).map((err, idx) => (
                      <div key={idx} className="py-1 truncate">
                        {err}
                      </div>
                    ))}
                    {importSummary.errors.length > 20 && (
                      <div className="py-1 text-center font-semibold text-[10px]">
                        + {importSummary.errors.length - 20} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
