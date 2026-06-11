"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bookmark,
  Bot,
  Clock,
  FolderClosed,
  FolderTree,
  Heart,
  HeartPulse,
  Home,
  LogOut,
  Settings,
  Tag,
  Menu,
  X,
  History,
  Target,
  Search,
  Download,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "All Bookmarks", href: "/dashboard/bookmarks", icon: Bookmark },
    { name: "Favorites", href: "/dashboard/bookmarks?filter=favorite", icon: Heart },
    { name: "Read Later", href: "/dashboard/bookmarks?filter=readlater", icon: Clock },
    { name: "Folders", href: "/dashboard/folders", icon: FolderClosed },
    { name: "AI Folder Organizer", href: "/dashboard/folders/organize", icon: FolderTree },
    { name: "Health Check", href: "/dashboard/health-check", icon: HeartPulse },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Activity Log", href: "/dashboard/activity", icon: History },
    { name: "Goals & Productivity", href: "/dashboard/goals", icon: Target },
    { name: "Tags", href: "/dashboard/tags", icon: Tag },
    { name: "AI Assistant", href: "/dashboard/assistant", icon: Bot },
    { name: "Search Center", href: "/dashboard/search", icon: Search },
    { name: "Import", href: "/dashboard/import", icon: Upload },
    { name: "Export", href: "/dashboard/export", icon: Download },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed left-4 top-4 z-50 block lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Close button (mobile only) */}
          <div className="flex items-center justify-between border-b p-4 lg:hidden">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Logo and title */}
          <div className="hidden items-center gap-2 border-b p-4 lg:flex">
            <Bookmark className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Bookmark Manager</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                let isActive = false;
                
                if (item.name === "All Bookmarks") {
                  isActive = pathname === "/dashboard/bookmarks" && !searchParams.get("filter");
                } else if (item.name === "Favorites") {
                  isActive = pathname === "/dashboard/bookmarks" && searchParams.get("filter") === "favorite";
                } else if (item.name === "Read Later") {
                  isActive = pathname === "/dashboard/bookmarks" && searchParams.get("filter") === "readlater";
                } else {
                  isActive = pathname === item.href || 
                    (pathname.startsWith(item.href) && item.href !== "/dashboard");
                }
                  
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout button */}
          <div className="border-t p-4">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 