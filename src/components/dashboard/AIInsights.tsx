"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Brain,
  Compass,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Tag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Target,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkInsights {
  totalBookmarks: number;
  topInterests: string[];
  topTags: string[];
  recommendedSkill: string;
  recommendedSkillReason: string[];
  careerPath: string;
  learningProgress: string[];
  knowledgeGaps: string[];
  learningRoadmap: {
    current: string[];
    next: string[];
    later: string[];
    goal: string;
  };
  generatedAt: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  color = "text-primary",
}: {
  icon: React.ElementType;
  title: string;
  color?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className={cn("h-4 w-4", color)} />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function TagPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
      {label}
    </span>
  );
}

function BulletItem({
  text,
  variant = "default",
}: {
  text: string;
  variant?: "default" | "gap";
}) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      {variant === "gap" ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
      )}
      <span>{text}</span>
    </li>
  );
}

function InsightCard({
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

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted",
        className
      )}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* header skeleton */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-7 w-40" />
        <SkeletonBlock className="h-8 w-28" />
      </div>
      {/* stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonBlock key={i} className="h-20" />
        ))}
      </div>
      {/* cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <SkeletonBlock key={i} className="h-36" />
        ))}
      </div>
      <SkeletonBlock className="h-24" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIInsights() {
  const [insights, setInsights] = useState<BookmarkInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const url = refresh ? "/api/insights?refresh=1" : "/api/insights";
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load insights.");
      }

      setInsights(data as BookmarkInsights);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ── Loading state ──
  if (isLoading) return <LoadingSkeleton />;

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
        <AlertTriangle className="mb-3 h-8 w-8 text-amber-500" />
        <p className="mb-4 text-sm font-medium text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchInsights()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    );
  }

  if (!insights) return null;

  const generatedDate = new Date(insights.generatedAt).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <section aria-label="AI Insights" className="space-y-4">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-xl font-semibold"> AI Insights</h2>
        </div>
        <Button
          id="insights-refresh-btn"
          variant="outline"
          size="sm"
          onClick={() => fetchInsights(true)}
          disabled={isRefreshing}
          aria-label="Refresh AI insights"
        >
          <RefreshCw
            className={cn("mr-2 h-3.5 w-3.5", isRefreshing && "animate-spin")}
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* ── Stat row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Bookmarks analysed"
          value={String(insights.totalBookmarks)}
          icon={BarChart3}
          color="text-blue-500"
          bg="bg-blue-500/10"
        />
        <StatTile
          label="Top interests"
          value={String(insights.topInterests.length)}
          icon={Brain}
          color="text-violet-500"
          bg="bg-violet-500/10"
        />
        <StatTile
          label="Dominant tags"
          value={String(insights.topTags.length)}
          icon={Tag}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
        <StatTile
          label="Knowledge gaps"
          value={String(insights.knowledgeGaps.length)}
          icon={Compass}
          color="text-amber-500"
          bg="bg-amber-500/10"
        />
      </div>

      {/* ── 2-column card grid ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Top Interests */}
        <InsightCard>
          <SectionHeader icon={Brain} title="Top Interests" color="text-violet-500" />
          <div className="flex flex-wrap gap-2">
            {insights.topInterests.length > 0 ? (
              insights.topInterests.map((interest) => (
                <TagPill key={interest} label={interest} />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No interests detected yet.</p>
            )}
          </div>
        </InsightCard>

        {/* Top Tags */}
        <InsightCard>
          <SectionHeader icon={Tag} title="Top Tags" color="text-emerald-500" />
          <div className="flex flex-wrap gap-2">
            {insights.topTags.length > 0 ? (
              insights.topTags.map((tag) => (
                <TagPill key={tag} label={`#${tag}`} />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No tags detected yet.</p>
            )}
          </div>
        </InsightCard>

        {/* Learning Progress */}
        <InsightCard>
          <SectionHeader
            icon={TrendingUp}
            title="Learning Progress"
            color="text-blue-500"
          />
          {insights.learningProgress.length > 0 ? (
            <ul className="space-y-2">
              {insights.learningProgress.map((item) => (
                <BulletItem key={item} text={item} variant="default" />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add more bookmarks to see progress insights.
            </p>
          )}
        </InsightCard>

        {/* Knowledge Gaps */}
        <InsightCard>
          <SectionHeader
            icon={Compass}
            title="Knowledge Gaps"
            color="text-amber-500"
          />
          {insights.knowledgeGaps.length > 0 ? (
            <ul className="space-y-2">
              {insights.knowledgeGaps.map((gap) => (
                <BulletItem key={gap} text={gap} variant="gap" />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No significant gaps detected — great coverage!
            </p>
          )}
        </InsightCard>
      </div>

      {/* ── Recommended Skill ── */}
      <InsightCard className="border-primary/20 bg-primary/5">
        <SectionHeader icon={Sparkles} title="Recommended Next Skill" color="text-primary" />
        {insights.recommendedSkill && insights.recommendedSkill !== "N/A" ? (
          <div className="space-y-3">
            {/* Skill name */}
            <p className="text-base font-semibold">{insights.recommendedSkill}</p>

            {/* Why this skill? */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Why this skill?
              </p>
              <ul className="space-y-1.5">
                {(insights.recommendedSkillReason.length > 0
                  ? insights.recommendedSkillReason
                  : [
                      "Based on your current learning profile, this skill is the best next step.",
                    ]
                ).map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add more bookmarks to get a skill recommendation.
          </p>
        )}
      </InsightCard>

      {/* ── Learning Roadmap ── */}
      <InsightCard className="border-emerald-500/20 bg-emerald-500/5">
        <SectionHeader icon={Target} title="🚀 Learning Roadmap" color="text-emerald-500" />
        <div className="space-y-4 mt-2">
          {/* Current */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">
              Current
            </span>
            <ul className="space-y-1.5">
              {insights.learningRoadmap?.current && insights.learningRoadmap.current.length > 0 ? (
                insights.learningRoadmap.current.map((skill, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{skill}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground italic">No current skills detected.</li>
              )}
            </ul>
          </div>

          {/* Arrow Next */}
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70 pl-1">
            <ArrowDown className="h-3 w-3" />
            <span>Next</span>
          </div>

          {/* Next */}
          <div>
            <ul className="space-y-1.5">
              {insights.learningRoadmap?.next && insights.learningRoadmap.next.length > 0 ? (
                insights.learningRoadmap.next.map((skill, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <span>{skill}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground italic">No next skills suggested.</li>
              )}
            </ul>
          </div>

          {/* Arrow Later */}
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70 pl-1">
            <ArrowDown className="h-3 w-3" />
            <span>Later</span>
          </div>

          {/* Later */}
          <div>
            <ul className="space-y-1.5">
              {insights.learningRoadmap?.later && insights.learningRoadmap.later.length > 0 ? (
                insights.learningRoadmap.later.map((skill, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-500" />
                    <span>{skill}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground italic">No future skills suggested.</li>
              )}
            </ul>
          </div>

          {/* Arrow Goal */}
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/70 pl-1">
            <ArrowDown className="h-3 w-3" />
            <span>Goal</span>
          </div>

          {/* Goal */}
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/15">
            <span className="text-xl">🎯</span>
            <div>
              <p className="text-sm font-bold text-foreground">
                {insights.learningRoadmap?.goal || "Not available"}
              </p>
            </div>
          </div>
        </div>
      </InsightCard>

      {/* ── Career Path ── */}
      <InsightCard className="border-violet-500/20 bg-violet-500/5">
        <SectionHeader icon={Lightbulb} title="Suggested Career Path" color="text-violet-500" />
        {insights.careerPath && insights.careerPath !== "N/A" ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insights.careerPath}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add more bookmarks to get a career path suggestion.
          </p>
        )}
      </InsightCard>

      {/* ── Generated at timestamp ── */}
      <p className="text-right text-[11px] text-muted-foreground/60">
        Insights generated at {generatedDate} · cached for 24 hours ·{" "}
        <button
          onClick={() => fetchInsights(true)}
          disabled={isRefreshing}
          className="underline underline-offset-2 hover:text-muted-foreground disabled:cursor-not-allowed"
        >
          refresh now
        </button>
      </p>
    </section>
  );
}

// ─── StatTile ─────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", bg)}>
        <Icon className={cn("h-3.5 w-3.5", color)} />
      </div>
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
