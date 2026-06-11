"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  Calendar,
  Clock,
  Flame,
  FolderOpen,
  Heart,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Star,
  Tag,
  Trophy,
  TrendingUp,
  Zap,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  AnalyticsSummary,
  GrowthRange,
  ActivityHeatmapDay,
} from "@/lib/analytics";

// ─── Colour palette ───────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#14b8a6", // teal
  "#f97316", // orange
  "#a855f7", // purple
];

const HEATMAP_COLORS = [
  "bg-muted/30 dark:bg-muted/20",       // level 0
  "bg-emerald-200 dark:bg-emerald-900/60", // level 1
  "bg-emerald-300 dark:bg-emerald-700/70", // level 2
  "bg-emerald-500 dark:bg-emerald-600",    // level 3
  "bg-emerald-600 dark:bg-emerald-400",    // level 4
];

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted/60 dark:bg-muted/40",
        className
      )}
    />
  );
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      {/* growth chart */}
      <Skeleton className="h-72" />
      {/* tags + folder */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      {/* favorites + read-later + streak */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      {/* heatmap */}
      <Skeleton className="h-36" />
      {/* insights */}
      <Skeleton className="h-48" />
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  color = "text-primary",
}: {
  icon: React.ElementType;
  title: string;
  color?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          color.includes("indigo")
            ? "bg-indigo-500/10"
            : color.includes("violet")
            ? "bg-violet-500/10"
            : color.includes("pink")
            ? "bg-pink-500/10"
            : color.includes("amber")
            ? "bg-amber-500/10"
            : color.includes("emerald")
            ? "bg-emerald-500/10"
            : color.includes("blue")
            ? "bg-blue-500/10"
            : "bg-primary/10"
        )}
      >
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

// ─── Overview Cards ───────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ElementType;
  value: number;
  label: string;
  iconColor: string;
  iconBg: string;
}

function MetricCard({
  icon: Icon,
  value,
  label,
  iconColor,
  iconBg,
}: MetricCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          iconBg
        )}
      >
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none tabular-nums">{value.toLocaleString()}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Growth Chart ─────────────────────────────────────────────────────────────

const RANGE_LABELS: Record<GrowthRange, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "6m": "Last 6 Months",
  "12m": "Last 12 Months",
};

function GrowthChart({
  growth,
}: {
  growth: AnalyticsSummary["growth"];
}) {
  const [range, setRange] = useState<GrowthRange>("30d");
  const data = growth[range];

  return (
    <SectionCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle icon={TrendingUp} title="Bookmark Growth" color="text-indigo-500" />
        <div className="flex flex-wrap gap-1">
          {(["7d", "30d", "6m", "12m"] as GrowthRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval={range === "7d" ? 0 : "preserveStartEnd"}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
              color: "hsl(var(--foreground))",
            }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value) => [value as number, "Bookmarks"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#growthGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#6366f1" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ─── Top Tags Chart ───────────────────────────────────────────────────────────

function TopTagsChart({ tags }: { tags: AnalyticsSummary["topTags"] }) {
  const maxCount = tags[0]?.count ?? 1;

  return (
    <SectionCard>
      <SectionTitle icon={Tag} title="Top 10 Tags" color="text-violet-500" />
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tags found. Add tags to your bookmarks to see analytics.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={tags}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, maxCount]}
            />
            <YAxis
              type="category"
              dataKey="tag"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={70}
              tickFormatter={(v: string) =>
                v.length > 10 ? v.slice(0, 10) + "…" : v
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value) => [value as number, "Bookmarks"]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {tags.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
}

// ─── Folder Distribution Pie ──────────────────────────────────────────────────

function FolderDistributionChart({
  folders,
}: {
  folders: AnalyticsSummary["folderDistribution"];
}) {
  return (
    <SectionCard>
      <SectionTitle icon={FolderOpen} title="Folder Distribution" color="text-amber-500" />
      {folders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No folders found. Organise your bookmarks into folders to see distribution.
        </p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={folders}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {folders.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value, name) => [
                  `${value as number} bookmarks`,
                  name as string,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex-1 space-y-1.5 min-w-0">
            {folders.slice(0, 6).map((f, i) => (
              <div key={f.folderId} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
                <span className="flex-1 truncate font-medium">{f.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {f.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Donut / Ring helper ──────────────────────────────────────────────────────

function DonutRing({
  percentage,
  color,
  size = 80,
}: {
  percentage: number;
  color: string;
  size?: number;
}) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const filled = (percentage / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="7"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-lg font-bold">{percentage}%</span>
      </div>
    </div>
  );
}

// ─── Favorites & Read-Later Cards ─────────────────────────────────────────────

function FavoritesCard({
  analytics,
}: {
  analytics: AnalyticsSummary["favoritesAnalytics"];
}) {
  return (
    <SectionCard>
      <SectionTitle icon={Heart} title="Favorites" color="text-pink-500" />
      <div className="flex items-center gap-4">
        <DonutRing percentage={analytics.percentage} color="#ec4899" />
        <div>
          <p className="text-2xl font-bold tabular-nums">{analytics.total}</p>
          <p className="text-xs text-muted-foreground">
            Favorited bookmarks
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {analytics.percentage}% of your collection
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

function ReadLaterCard({
  analytics,
}: {
  analytics: AnalyticsSummary["readLaterAnalytics"];
}) {
  return (
    <SectionCard>
      <SectionTitle icon={Clock} title="Read Later" color="text-blue-500" />
      <div className="flex items-center gap-4">
        <DonutRing percentage={analytics.percentage} color="#3b82f6" />
        <div>
          <p className="text-2xl font-bold tabular-nums">{analytics.total}</p>
          <p className="text-xs text-muted-foreground">Queued to read</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {analytics.percentage}% of your collection
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Most Active Day ──────────────────────────────────────────────────────────

function MostActiveDayCard({
  data,
}: {
  data: AnalyticsSummary["mostActiveDay"];
}) {
  return (
    <SectionCard>
      <SectionTitle icon={Calendar} title="Most Active Day" color="text-emerald-500" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-400" />
          <p className="text-xl font-bold">{data.dayName}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Avg. {data.averageCount} bookmark{data.averageCount !== 1 ? "s" : ""}{" "}
          saved per week on this day
        </p>
      </div>
    </SectionCard>
  );
}

// ─── Saving Streak ────────────────────────────────────────────────────────────

function StreakCard({ streak }: { streak: AnalyticsSummary["savingStreak"] }) {
  return (
    <SectionCard>
      <SectionTitle icon={Flame} title="Saving Streak" color="text-orange-500" />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Current
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
            {streak.currentStreak}
          </p>
          <p className="text-[10px] text-muted-foreground">days</p>
        </div>
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Best
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {streak.bestStreak}
          </p>
          <p className="text-[10px] text-muted-foreground">days</p>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function ActivityHeatmap({ data }: { data: ActivityHeatmapDay[] }) {
  // Group by week columns
  const weeks = useMemo(() => {
    const result: ActivityHeatmapDay[][] = [];
    let currentWeek: ActivityHeatmapDay[] = [];

    // Pad the start so the first day falls on its correct weekday column
    if (data.length > 0) {
      const firstDay = new Date(data[0].date + "T00:00:00Z").getUTCDay(); // 0=Sun
      for (let i = 0; i < firstDay; i++) {
        currentWeek.push({ date: "", count: 0, level: 0 });
      }
    }

    for (const day of data) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [data]);

  // Compute month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstReal = week.find((d) => d.date !== "");
      if (!firstReal) return;
      const m = new Date(firstReal.date + "T00:00:00Z").getUTCMonth();
      if (m !== lastMonth) {
        labels.push({ label: MONTH_NAMES[m], weekIndex: wi });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const [tooltip, setTooltip] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  return (
    <SectionCard>
      <SectionTitle icon={Zap} title="Activity Heatmap (Last 365 Days)" color="text-emerald-500" />
      <div className="overflow-x-auto pb-1">
        <div className="relative inline-block min-w-full">
          {/* Month labels */}
          <div
            className="mb-1 flex"
            style={{ paddingLeft: "0px" }}
          >
            {weeks.map((_, wi) => {
              const label = monthLabels.find((m) => m.weekIndex === wi);
              return (
                <div
                  key={wi}
                  className="w-3 shrink-0 text-[9px] text-muted-foreground"
                  style={{ marginRight: "2px" }}
                >
                  {label ? label.label : ""}
                </div>
              );
            })}
          </div>

          {/* Day rows */}
          <div className="flex gap-[2px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={cn(
                      "h-3 w-3 rounded-[2px] cursor-pointer transition-opacity hover:opacity-70",
                      day.date
                        ? HEATMAP_COLORS[day.level]
                        : "bg-transparent"
                    )}
                    onMouseEnter={(e) => {
                      if (!day.date) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        date: day.date,
                        count: day.count,
                        x: rect.left,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Inline tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none fixed z-50 rounded-md border bg-popover px-2 py-1 text-[11px] shadow-md text-popover-foreground"
              style={{
                left: tooltip.x + 16,
                top: tooltip.y - 30,
              }}
            >
              <span className="font-medium">{tooltip.count}</span> bookmark
              {tooltip.count !== 1 ? "s" : ""} on{" "}
              {new Date(tooltip.date + "T00:00:00Z").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {HEATMAP_COLORS.map((cls, i) => (
          <div
            key={i}
            className={cn("h-3 w-3 rounded-[2px]", i === 0 ? "bg-muted/50" : cls)}
          />
        ))}
        <span>More</span>
      </div>
    </SectionCard>
  );
}

// ─── Insights Panel ───────────────────────────────────────────────────────────

function InsightsPanel({ insights }: { insights: string[] }) {
  return (
    <SectionCard className="border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/[0.03]">
      <SectionTitle
        icon={Sparkles}
        title="Smart Insights"
        color="text-indigo-500"
      />
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add more bookmarks to unlock personalised insights.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <span className="text-muted-foreground leading-relaxed">
                {insight}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <BarChart3 className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mb-1 text-base font-semibold">No Bookmarks Yet</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Start saving bookmarks to see your analytics dashboard come to life.
      </p>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">Failed to load analytics</p>
        <p className="mt-0.5 text-sm">{message}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookmarkAnalytics() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (refresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = refresh ? "/api/analytics?refresh=1" : "/api/analytics";
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          (json as { message?: string }).message ||
            "Failed to load analytics."
        );
      }
      setData(json as AnalyticsSummary);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const generatedAt = data
    ? new Date(data.generatedAt).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <section aria-label="Bookmark Analytics Dashboard" className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">📊 Analytics Dashboard</h2>
            {generatedAt && (
              <p className="text-[11px] text-muted-foreground">
                Last generated: {generatedAt} · cached 6 hours
              </p>
            )}
          </div>
        </div>
        {!isLoading && (
          <Button
            id="analytics-refresh-btn"
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(true)}
            aria-label="Refresh analytics"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && <AnalyticsLoadingSkeleton />}

      {/* ── Error ── */}
      {error && !isLoading && (
        <ErrorState message={error} onRetry={() => fetchAnalytics(false)} />
      )}

      {/* ── Content ── */}
      {!isLoading && !error && data && (
        <>
          {data.overview.totalBookmarks === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* 1. Overview Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MetricCard
                  icon={Bookmark}
                  value={data.overview.totalBookmarks}
                  label="Total Bookmarks"
                  iconColor="text-indigo-500"
                  iconBg="bg-indigo-500/10"
                />
                <MetricCard
                  icon={FolderOpen}
                  value={data.overview.totalFolders}
                  label="Total Folders"
                  iconColor="text-amber-500"
                  iconBg="bg-amber-500/10"
                />
                <MetricCard
                  icon={Heart}
                  value={data.overview.favoritesCount}
                  label="Favorites"
                  iconColor="text-pink-500"
                  iconBg="bg-pink-500/10"
                />
                <MetricCard
                  icon={Clock}
                  value={data.overview.readLaterCount}
                  label="Read Later"
                  iconColor="text-blue-500"
                  iconBg="bg-blue-500/10"
                />
                <MetricCard
                  icon={BookmarkPlus}
                  value={data.overview.addedThisWeek}
                  label="Added This Week"
                  iconColor="text-emerald-500"
                  iconBg="bg-emerald-500/10"
                />
                <MetricCard
                  icon={BookmarkCheck}
                  value={data.overview.addedThisMonth}
                  label="Added This Month"
                  iconColor="text-violet-500"
                  iconBg="bg-violet-500/10"
                />
              </div>

              {/* 2. Growth Chart */}
              <GrowthChart growth={data.growth} />

              {/* 3. Tags + Folder Distribution */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TopTagsChart tags={data.topTags} />
                <FolderDistributionChart folders={data.folderDistribution} />
              </div>

              {/* 4. Favorites + Read Later + Active Day + Streak */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FavoritesCard analytics={data.favoritesAnalytics} />
                <ReadLaterCard analytics={data.readLaterAnalytics} />
                <MostActiveDayCard data={data.mostActiveDay} />
                <StreakCard streak={data.savingStreak} />
              </div>

              {/* 5. Activity Heatmap */}
              <ActivityHeatmap data={data.heatmap} />

              {/* 6. Insights */}
              <InsightsPanel insights={data.insights} />
            </>
          )}
        </>
      )}
    </section>
  );
}
