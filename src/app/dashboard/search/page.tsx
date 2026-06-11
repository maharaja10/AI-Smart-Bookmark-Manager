"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Filter, SortAsc, X, BookOpen, Heart, Clock,
  FolderOpen, Tag, CalendarRange, ChevronDown, Loader2,
  BookmarkIcon, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, getDomainFromUrl } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookmarkResult {
  _id: string;
  title: string;
  url: string;
  description: string;
  tags: string[];
  folderId: string | null;
  folderName: string | null;
  ogImage: string;
  isFavorite: boolean;
  isReadLater: boolean;
  isRead: boolean;
  createdAt: string;
}

interface FolderItem { _id: string; name: string; }

const SORT_OPTIONS = [
  { value: "newest",  label: "Newest First" },
  { value: "oldest",  label: "Oldest First" },
  { value: "updated", label: "Recently Updated" },
  { value: "read",    label: "Recently Read" },
  { value: "az",      label: "A → Z" },
  { value: "za",      label: "Z → A" },
];

// ── Debounce ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return dv;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query,     setQuery]     = useState(searchParams.get("q") || "");
  const [filter,    setFilter]    = useState(searchParams.get("filter") || "");
  const [folderId,  setFolderId]  = useState(searchParams.get("folderId") || "");
  const [tags,      setTags]      = useState<string[]>(searchParams.getAll("tags"));
  const [dateFrom,  setDateFrom]  = useState(searchParams.get("dateFrom") || "");
  const [dateTo,    setDateTo]    = useState(searchParams.get("dateTo") || "");
  const [sort,      setSort]      = useState(searchParams.get("sort") || "newest");
  const [page,      setPage]      = useState(1);

  const [results,   setResults]   = useState<BookmarkResult[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [folders,   setFolders]   = useState<FolderItem[]>([]);
  const [allTags,   setAllTags]   = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const limit = 20;

  // ── Fetch folder list once ─────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/folders").then(r => r.json()).then(d => setFolders(d.folders || [])).catch(() => {});
    fetch("/api/search/suggestions?q=").then(r => r.json()).then(d => setAllTags((d.topTags || []).map((t: any) => t.tag))).catch(() => {});
  }, []);

  // ── Run search whenever filters change ────────────────────────────────────
  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q",        debouncedQuery);
      if (filter)         params.set("filter",   filter);
      if (folderId)       params.set("folderId", folderId);
      tags.forEach(t =>   params.append("tags",  t));
      if (dateFrom)       params.set("dateFrom", dateFrom);
      if (dateTo)         params.set("dateTo",   dateTo);
      params.set("sort",  sort);
      params.set("page",  String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.bookmarks || []);
      setTotal(data.pagination?.total || 0);
      setPages(data.pagination?.pages || 1);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [debouncedQuery, filter, folderId, tags, dateFrom, dateTo, sort, page]);

  useEffect(() => { runSearch(); }, [runSearch]);

  // ── Record search in history when query finalises ──────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    fetch("/api/search/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: debouncedQuery.trim() }),
    }).catch(() => {});
  }, [debouncedQuery]);

  // ── Active filter count ────────────────────────────────────────────────────
  const activeFilterCount = [filter, folderId, ...tags, dateFrom, dateTo].filter(Boolean).length;

  const clearAll = () => { setFilter(""); setFolderId(""); setTags([]); setDateFrom(""); setDateTo(""); setPage(1); };

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="h-7 w-7 text-primary" />
          Search
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(p => !p)}
            className="gap-1.5"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Search Input ────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search bookmarks, URLs, descriptions, tags…"
          className="w-full rounded-lg border bg-background pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          id="search-page-input"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Active Filter Chips ─────────────────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filter && (
            <FilterChip label={filter === "favorite" ? "❤ Favorites" : filter === "readlater" ? "🕐 Read Later" : filter === "read" ? "✓ Read" : "○ Unread"} onRemove={() => setFilter("")} />
          )}
          {folderId && folders.find(f => f._id === folderId) && (
            <FilterChip label={`📁 ${folders.find(f => f._id === folderId)!.name}`} onRemove={() => setFolderId("")} />
          )}
          {tags.map(t => <FilterChip key={t} label={`# ${t}`} onRemove={() => toggleTag(t)} />)}
          {dateFrom && <FilterChip label={`From: ${dateFrom}`} onRemove={() => setDateFrom("")} />}
          {dateTo && <FilterChip label={`To: ${dateTo}`} onRemove={() => setDateTo("")} />}
        </div>
      )}

      {/* ── Filter Panel ────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
              <div className="flex flex-col gap-1">
                {[
                  { value: "favorite",  icon: Heart,         label: "Favorites" },
                  { value: "readlater", icon: Clock,         label: "Read Later" },
                  { value: "read",      icon: CheckCircle2,  label: "Read" },
                  { value: "unread",    icon: BookOpen,      label: "Unread" },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilter(filter === value ? "" : value)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left ${filter === value ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Folder filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Folder</label>
              <select
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Folders</option>
                {folders.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <CalendarRange className="h-3 w-3" />
                Date Range
              </label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="From" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="To" />
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <SortAsc className="h-3 w-3" />
                Sort By
              </label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${tags.includes(t) ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/50 hover:text-primary"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Results Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {loading ? "Searching…" : `${total.toLocaleString()} result${total !== 1 ? "s" : ""}${debouncedQuery ? ` for "${debouncedQuery}"` : ""}`}
        </span>
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-2 py-1 text-xs focus:outline-none"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Results Grid ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {debouncedQuery ? `No bookmarks found for "${debouncedQuery}"` : "Enter a query or apply filters to search"}
          </p>
          {activeFilterCount > 0 && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>Clear Filters</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map(b => (
            <SearchResultCard key={b._id} bookmark={b} query={debouncedQuery} />
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="flex h-9 items-center px-4 text-sm">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ── Filter Chip ───────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-primary/60 transition-colors" aria-label="Remove filter">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ── Search Result Card ────────────────────────────────────────────────────────

function SearchResultCard({ bookmark, query }: { bookmark: BookmarkResult; query: string }) {
  function Highlight({ text }: { text: string }) {
    if (!query.trim()) return <>{text}</>;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((p, i) =>
          regex.test(p) ? <mark key={i} className="bg-primary/20 text-primary rounded px-0.5 not-italic">{p}</mark> : <span key={i}>{p}</span>
        )}
      </>
    );
  }

  return (
    <div className="group flex flex-col rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:border-primary/30">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/dashboard/bookmarks/${bookmark._id}`} className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">
            <Highlight text={bookmark.title} />
          </h3>
        </Link>
        <div className="flex gap-1 shrink-0">
          {bookmark.isFavorite  && <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />}
          {bookmark.isRead      && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mb-1">{getDomainFromUrl(bookmark.url)}</p>

      {bookmark.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          <Highlight text={bookmark.description} />
        </p>
      )}

      {bookmark.folderName && (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
          <FolderOpen className="h-3 w-3" />
          {bookmark.folderName}
        </p>
      )}

      {bookmark.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-2">
          {bookmark.tags.slice(0, 3).map(t => (
            <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">{t}</span>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-2">{formatDate(bookmark.createdAt)}</p>
    </div>
  );
}
