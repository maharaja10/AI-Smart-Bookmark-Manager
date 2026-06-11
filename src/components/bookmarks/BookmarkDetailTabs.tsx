"use client";

import React, { useState } from "react";
import { Info, History, Trash2 } from "lucide-react";
import VersionHistory from "./VersionHistory";

interface BookmarkDetailTabsProps {
  bookmarkId: string;
  isDeleted: boolean;
  children: React.ReactNode;
}

export default function BookmarkDetailTabs({
  bookmarkId,
  isDeleted,
  children,
}: BookmarkDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<"details" | "history">(
    isDeleted ? "history" : "details"
  );

  return (
    <div className="space-y-4">
      {/* Tabs List */}
      <div className="flex border-b border-border">
        {!isDeleted && (
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[2px] ${
              activeTab === "details"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Info className="h-4 w-4" />
            Details
          </button>
        )}

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[2px] ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          } ${isDeleted ? "pl-0" : ""}`}
        >
          <History className="h-4 w-4" />
          Version History
        </button>
      </div>

      {/* Tabs Content */}
      <div className="mt-4">
        {activeTab === "details" && !isDeleted && (
          <div className="animate-fade-in">{children}</div>
        )}

        {activeTab === "history" && (
          <div className="animate-fade-in">
            <VersionHistory bookmarkId={bookmarkId} isDeletedInitially={isDeleted} />
          </div>
        )}
      </div>
    </div>
  );
}
