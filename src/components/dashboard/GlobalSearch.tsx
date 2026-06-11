"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Clock,
  Tag,
  Bookmark,
  FolderOpen,
  X,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchHistoryItem {
  _id: string;
  query: string;
  searchedAt: string;
}

interface TagSuggestion {
  tag: string;
  count: number;
}

interface BookmarkSuggestion {
  _id: string;
  title: string;
  url: string;
  folderName: string | null;
}

interface FolderSuggestion {
  _id: string;
  name: string;
  bookmarkCount: number;
}

interface Suggestions {
  topTags: TagSuggestion[];
  bookmarks: BookmarkSuggestion[];
  folders: FolderSuggestion[];
}

// ── Highlight matching text ───────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions>({
    topTags: [],
    bookmarks: [],
    folders: [],
  });
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // ── Flat navigation items (for keyboard nav) ────────────────────────────
  type NavItem =
    | { type: "history"; item: SearchHistoryItem }
    | { type: "tag"; item: TagSuggestion }
    | { type: "bookmark"; item: BookmarkSuggestion }
    | { type: "folder"; item: FolderSuggestion };

  const navItems: NavItem[] = [
    ...history.map((h) => ({ type: "history" as const, item: h })),
    ...suggestions.topTags.slice(0, 5).map((t) => ({ type: "tag" as const, item: t })),
    ...suggestions.bookmarks.map((b) => ({ type: "bookmark" as const, item: b })),
    ...suggestions.folders.map((f) => ({ type: "folder" as const, item: f })),
  ];

  // ── Fetch search history ────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/search/history");
      if (res.ok) setHistory(await res.json());
    } catch { /* silent */ }
  }, []);

  // ── Fetch live suggestions ──────────────────────────────────────────────
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`
        );
        if (res.ok) setSuggestions(await res.json());
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    };
    if (isOpen) fetchSuggestions();
  }, [debouncedQuery, isOpen]);

  // ── Fetch history when opening ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen, fetchHistory]);

  // ── Click outside → close ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Record search + navigate ─────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setIsOpen(false);
    setQuery("");
    // Record in history (fire-and-forget)
    fetch("/api/search/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q.trim() }),
    }).catch(() => {});
    router.push(`/dashboard/search?q=${encodeURIComponent(q.trim())}`);
  }, [router]);

  const clearHistory = async () => {
    await fetch("/api/search/history", { method: "DELETE" });
    setHistory([]);
  };

  // ── Activate a nav item ──────────────────────────────────────────────────
  const activateItem = useCallback((item: NavItem) => {
    switch (item.type) {
      case "history":
        runSearch(item.item.query);
        break;
      case "tag":
        setIsOpen(false);
        setQuery("");
        router.push(`/dashboard/bookmarks?tag=${encodeURIComponent(item.item.tag)}`);
        break;
      case "bookmark":
        setIsOpen(false);
        setQuery("");
        router.push(`/dashboard/bookmarks/${item.item._id}`);
        break;
      case "folder":
        setIsOpen(false);
        setQuery("");
        router.push(`/dashboard/bookmarks?folder=${item.item._id}`);
        break;
    }
  }, [runSearch, router]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, navItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && navItems[focusedIndex]) {
          activateItem(navItems[focusedIndex]);
        } else if (query.trim()) {
          runSearch(query);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Track global absolute index across sections
  let itemIdx = -1;
  const nextIdx = () => { itemIdx++; return itemIdx; };

  const historyToShow = query ? [] : history;
  const tagsToShow    = suggestions.topTags.slice(0, query ? 5 : 10);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl" id="global-search">
      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-2 rounded-lg border bg-background px-3 py-2 transition-all ${
          isOpen
            ? "border-primary shadow-md shadow-primary/10 ring-1 ring-primary/20"
            : "border-border hover:border-primary/50"
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setFocusedIndex(-1); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search bookmarks, tags, folders…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          id="global-search-input"
          autoComplete="off"
          aria-label="Global search"
          aria-expanded={isOpen}
          aria-controls="search-dropdown"
          role="combobox"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <kbd className="hidden sm:flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          id="search-dropdown"
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-2 max-h-[520px] overflow-y-auto rounded-xl border bg-popover shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* ── Section: Recent Searches ─────────────────────────────────── */}
          {historyToShow.length > 0 && (
            <section className="border-b">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </span>
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              </div>
              {historyToShow.map((h) => {
                const idx = nextIdx();
                return (
                  <button
                    key={h._id}
                    onClick={() => runSearch(h.query)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      focusedIndex === idx
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                    role="option"
                    aria-selected={focusedIndex === idx}
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{h.query}</span>
                    <Search className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </button>
                );
              })}
            </section>
          )}

          {/* ── Section: Suggested Tags ───────────────────────────────────── */}
          {tagsToShow.length > 0 && (
            <section className="border-b">
              <div className="px-4 py-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {query ? "Matching Tags" : "Suggested Tags"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                {tagsToShow.map((t) => {
                  const idx = nextIdx();
                  return (
                    <button
                      key={t.tag}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery("");
                        router.push(`/dashboard/bookmarks?tag=${encodeURIComponent(t.tag)}`);
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        focusedIndex === idx
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                      }`}
                      role="option"
                      aria-selected={focusedIndex === idx}
                    >
                      <span>{t.tag}</span>
                      <span className="opacity-60">({t.count})</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Section: Matching Bookmarks ───────────────────────────────── */}
          {suggestions.bookmarks.length > 0 && (
            <section className="border-b">
              <div className="px-4 py-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Bookmark className="h-3 w-3" />
                  Matching Bookmarks
                </span>
              </div>
              {suggestions.bookmarks.map((b) => {
                const idx = nextIdx();
                return (
                  <button
                    key={b._id}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      router.push(`/dashboard/bookmarks/${b._id}`);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group ${
                      focusedIndex === idx
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                    role="option"
                    aria-selected={focusedIndex === idx}
                  >
                    <Bookmark className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        <Highlight text={b.title} query={query} />
                      </p>
                      {b.folderName && (
                        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                          <FolderOpen className="h-3 w-3 inline" />
                          {b.folderName}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </section>
          )}

          {/* ── Section: Matching Folders ─────────────────────────────────── */}
          {suggestions.folders.length > 0 && (
            <section>
              <div className="px-4 py-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <FolderOpen className="h-3 w-3" />
                  Matching Folders
                </span>
              </div>
              {suggestions.folders.map((f) => {
                const idx = nextIdx();
                return (
                  <button
                    key={f._id}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      router.push(`/dashboard/bookmarks?folder=${f._id}`);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      focusedIndex === idx
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                    role="option"
                    aria-selected={focusedIndex === idx}
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        <Highlight text={f.name} query={query} />
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {f.bookmarkCount} bookmarks
                    </span>
                  </button>
                );
              })}
            </section>
          )}

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {!isLoading &&
            query &&
            suggestions.bookmarks.length === 0 &&
            suggestions.folders.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No results for{" "}
                  <span className="font-semibold text-foreground">"{query}"</span>
                </p>
                <button
                  onClick={() => runSearch(query)}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Search all bookmarks →
                </button>
              </div>
            )}

          {/* ── Footer: full search link ───────────────────────────────────── */}
          {query && (
            <div className="border-t px-4 py-2.5">
              <button
                onClick={() => runSearch(query)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors group"
              >
                <span>
                  Search for{" "}
                  <span className="font-semibold text-foreground group-hover:text-primary">
                    "{query}"
                  </span>
                </span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                  ↵
                </kbd>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
