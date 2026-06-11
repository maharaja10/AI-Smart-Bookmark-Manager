"use client";

import { BookOpen, Heart, Tags, Bookmark } from "lucide-react";

interface TagProgress {
  tag: string;
  progressPercent: number;
  totalCount: number;
  readCount: number;
  favoritesCount: number;
}

interface TagProgressListProps {
  tagProgressList: TagProgress[];
}

export default function TagProgressList({ tagProgressList }: TagProgressListProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-3 mb-4">
        <Tags className="h-5 w-5 text-primary" />
        Learning Progress by Topic
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tagProgressList.map((tp) => (
          <div key={tp.tag} className="space-y-2 group">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground tracking-wide group-hover:text-primary transition-colors">
                {tp.tag}
              </span>
              <span className="font-bold text-primary">{tp.progressPercent}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${tp.progressPercent}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-0.5">
              <span className="flex items-center gap-0.5" title="Total saved bookmarks">
                <Bookmark className="h-3 w-3" />
                {tp.totalCount} saved
              </span>
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title="Bookmarks read">
                <BookOpen className="h-3 w-3" />
                {tp.readCount} read
              </span>
              <span className="flex items-center gap-0.5 text-pink-500" title="Bookmarks favorited">
                <Heart className="h-3 w-3 fill-current" />
                {tp.favoritesCount} favorites
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
