"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, Calendar, Folder, Tag, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useTags, TagItem } from "@/hooks/useTags";

interface FolderItem {
  _id: string;
  name: string;
}

interface AdvancedFiltersProps {
  tags?: TagItem[];
  folders: FolderItem[];
}

export default function AdvancedFilters({ tags: initialTags, folders }: AdvancedFiltersProps) {
  const { tags, loading, refetch } = useTags(initialTags);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Search input state
  const [search, setSearch] = useState(searchParams.get("search") || "");
  
  // Collapsible state
  const [isOpen, setIsOpen] = useState(false);

  // Read params
  const currentStatus = searchParams.get("status") || "";
  const currentFolder = searchParams.get("folder") || "";
  const currentSort = searchParams.get("sort") || "createdAt_desc";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  
  // Selected tags state
  const selectedTagsStr = searchParams.get("tags") || "";
  const selectedTags = selectedTagsStr ? selectedTagsStr.split(",").filter(Boolean) : [];

  // Dropdown visibility states
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch tags dynamically when dropdown opens
  useEffect(() => {
    if (showTagDropdown) {
      refetch();
    }
  }, [showTagDropdown, refetch]);

  // Close tag dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    // Reset page on filter change
    params.delete("page");

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: search || null });
  };

  const handleStatusToggle = (status: string) => {
    updateFilters({ status: currentStatus === status ? null : status });
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ folder: e.target.value || null });
  };

  const handleTagToggle = (tag: string) => {
    let nextTags: string[];
    if (selectedTags.includes(tag)) {
      nextTags = selectedTags.filter((t) => t !== tag);
    } else {
      nextTags = [...selectedTags, tag];
    }
    updateFilters({ tags: nextTags.length > 0 ? nextTags.join(",") : null });
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    updateFilters({ [field]: value || null });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ sort: e.target.value });
  };

  const clearAllFilters = () => {
    setSearch("");
    router.push(pathname);
  };

  const removeSingleFilter = (key: string, tagValue?: string) => {
    if (key === "tags" && tagValue) {
      const nextTags = selectedTags.filter((t) => t !== tagValue);
      updateFilters({ tags: nextTags.length > 0 ? nextTags.join(",") : null });
    } else if (key === "search") {
      setSearch("");
      updateFilters({ search: null });
    } else {
      updateFilters({ [key]: null });
    }
  };

  const hasActiveFilters = 
    searchParams.get("search") || 
    currentStatus || 
    currentFolder || 
    selectedTags.length > 0 || 
    startDate || 
    endDate;

  return (
    <div className="relative z-20 space-y-4 rounded-xl border bg-card/50 backdrop-blur-md p-4 shadow-sm">
      {/* Top Search & Collapsible toggle */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in bookmarks..."
              className="w-full rounded-md border bg-background px-3 py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => removeSingleFilter("search")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </Button>

          {/* Sort Dropdown */}
          <select
            value={currentSort}
            onChange={handleSortChange}
            className="rounded-md border bg-background border-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="createdAt_desc">Date Added (Newest)</option>
            <option value="createdAt_asc">Date Added (Oldest)</option>
            <option value="updatedAt_desc">Date Updated (Newest)</option>
            <option value="updatedAt_asc">Date Updated (Oldest)</option>
            <option value="lastVisited_desc">Last Visited (Newest)</option>
            <option value="lastVisited_asc">Last Visited (Oldest)</option>
          </select>
        </div>
      </div>

      {/* Advanced Drawer */}
      {isOpen && (
        <div className="pt-4 border-t grid gap-4 md:grid-cols-4 animate-in fade-in duration-200">
          {/* Status chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Status</label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Favorite", val: "favorite" },
                { name: "Read Later", val: "readlater" },
                { name: "Read", val: "read" },
                { name: "Unread", val: "unread" },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => handleStatusToggle(s.val)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-all font-medium ${
                    currentStatus === s.val
                      ? "bg-primary border-primary text-primary-foreground shadow"
                      : "bg-background hover:bg-accent border-border"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Folder dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Folder className="h-3 w-3" /> Folder
            </label>
            <select
              value={currentFolder}
              onChange={handleFolderChange}
              className="w-full rounded-md border bg-background border-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Folders</option>
              <option value="null">Uncategorized</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Dropdown */}
          <div className="space-y-2 relative z-30" ref={tagDropdownRef}>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" /> Tags
            </label>
            <button
              type="button"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="w-full flex items-center justify-between rounded-md border bg-background border-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-left"
            >
              <span className="truncate">
                {selectedTags.length === 0
                  ? "Select Tags"
                  : `${selectedTags.length} tag(s) selected`}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>

            {showTagDropdown && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-[220px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md p-2 space-y-1">
                {loading ? (
                  <div className="text-xs p-2 text-muted-foreground">Loading tags...</div>
                ) : tags.length === 0 ? (
                  <div className="text-xs p-2 text-muted-foreground">No tags found. Add tags to bookmarks first.</div>
                ) : (
                  tags.map((t) => {
                    const isSelected = selectedTags.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => handleTagToggle(t.name)}
                        className={`w-full flex items-center justify-between text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent transition-colors ${
                          isSelected ? "bg-accent font-semibold text-primary" : ""
                        }`}
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {t.count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Date range selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Date Range
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange("startDate", e.target.value)}
                className="w-full rounded-md border bg-background border-input px-2 py-1.5 text-xs focus:outline-none"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange("endDate", e.target.value)}
                className="w-full rounded-md border bg-background border-input px-2 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center pt-2 border-t text-xs">
          <span className="text-muted-foreground font-semibold">Active:</span>

          {searchParams.get("search") && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
              Search: "{searchParams.get("search")}"
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeSingleFilter("search")} />
            </span>
          )}

          {currentStatus && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium capitalize">
              Status: {currentStatus}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeSingleFilter("status")} />
            </span>
          )}

          {currentFolder && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
              Folder: {currentFolder === "null" ? "Uncategorized" : folders.find((f) => f._id === currentFolder)?.name || "Folder"}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeSingleFilter("folder")} />
            </span>
          )}

          {selectedTags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
              Tag: {tag}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeSingleFilter("tags", tag)} />
            </span>
          ))}

          {(startDate || endDate) && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
              Date: {startDate || "*"} to {endDate || "*"}
              <X className="h-3 w-3 cursor-pointer" onClick={() => {
                updateFilters({ startDate: null, endDate: null });
              }} />
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline font-semibold ml-auto"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
