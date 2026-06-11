"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Tag {
  name: string;
  count: number;
}

interface BookmarkFiltersProps {
  currentTag?: string;
  currentSearch?: string;
  tags: Tag[];
}

export default function BookmarkFilters({
  currentTag,
  currentSearch,
  tags,
}: BookmarkFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentSearch || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params = new URLSearchParams(window.location.search);
    
    if (search) {
      params.set("search", search);
      params.set("nl", "1");
    } else {
      params.delete("search");
      params.delete("nl");
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleTagClick = (tag: string) => {
    const params = new URLSearchParams(window.location.search);
    
    if (currentTag === tag) {
      params.delete("tag");
    } else {
      params.set("tag", tag);
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearSearch = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("search");
    params.delete("nl");
    router.push(`${pathname}?${params.toString()}`);
    setSearch("");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bookmarks..."
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit">Search</Button>
      </form>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Button
              key={tag.name}
              variant={currentTag === tag.name ? "default" : "outline"}
              size="sm"
              onClick={() => handleTagClick(tag.name)}
              className="flex items-center gap-1.5"
            >
              {tag.name}
              <span className="rounded-full bg-primary-foreground px-1.5 text-xs text-primary">
                {tag.count}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
} 