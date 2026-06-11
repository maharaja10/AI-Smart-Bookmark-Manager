"use client";

import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Plus, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import GlobalSearch from "@/components/dashboard/GlobalSearch";

export default function Header() {
  const { data: session } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 lg:px-6">
      {/* Left: mobile spacer */}
      <div className="flex lg:hidden w-10 shrink-0" />

      {/* Centre: Global Search */}
      <div className="flex-1 flex justify-center lg:justify-start">
        <GlobalSearch />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Add bookmark button */}
        <Link href="/dashboard/bookmarks/new">
          <Button size="sm" className="hidden lg:flex gap-1.5">
            <Plus className="h-4 w-4" />
            Add Bookmark
          </Button>
        </Link>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User profile */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 cursor-pointer"
            aria-label="User menu"
            aria-expanded={showDropdown}
          >
            <span className="hidden text-sm font-medium lg:block">
              {session?.user?.name}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {session?.user?.name ? session.user.name[0].toUpperCase() : "U"}
            </div>
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-card shadow-lg z-50">
              <div className="p-3 border-b">
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
              </div>
              <div className="p-1">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md"
                  onClick={() => setShowDropdown(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}