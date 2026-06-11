"use client";

import { useState, useCallback } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  HeartPulse,
  Info,
  Lightbulb,
  Link2Off,
  Loader2,
  RefreshCw,
  Tags,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DuplicateGroup {
  normalizedUrl: string;
  bookmarks: { id: string; title: string; url: string }[];
}

interface BrokenLink {
  id: string;
  title: string;
  url: string;
  status: number | "timeout" | "error";
}

interface MetadataIssue {
  id: string;
  title: string;
  url: string;
}

interface ScoreHistoryEntry {
  score: number;
  checkedAt: string;
}

interface HealthReport {
  healthScore: number;
  duplicateGroups: DuplicateGroup[];
  brokenLinks: BrokenLink[];
  missingTags: MetadataIssue[];
  missingDescriptions: MetadataIssue[];
  missingSummaries: MetadataIssue[];
  recommendations: string[];
  scoreHistory: ScoreHistoryEntry[];
  checkedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 50) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Critical";
}

function getStatusLabel(status: number | "timeout" | "error"): string {
  if (status === "timeout") return "Timeout";
  if (status === "error") return "Network Error";
  return `HTTP ${status}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function SectionHeader({
  icon: Icon,
  title,
  count,
  color = "text-primary",
  countColor,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  color?: string;
  countColor?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color)} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {count !== undefined && (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border",
            count === 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              : countColor ?? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          )}
        >
          {count === 0 ? "✓ None" : count}
        </span>
      )}
    </div>
  );
}

function EmptyIssue({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3 py-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      <p className="text-xs text-emerald-700 dark:text-emerald-400">{label}</p>
    </div>
  );
}

function IssueRow({
  title,
  url,
  badge,
}: {
  title: string;
  url: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{title}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 truncate text-[11px] text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{url}</span>
        </a>
      </div>
      {badge}
    </div>
  );
}

function CollapsibleList({
  items,
  renderItem,
  emptyLabel,
  maxVisible = 3,
}: {
  items: unknown[];
  renderItem: (item: unknown, index: number) => React.ReactNode;
  emptyLabel: string;
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return <EmptyIssue label={emptyLabel} />;

  const visible = expanded ? items : items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <div className="space-y-2">
      {visible.map((item, i) => renderItem(item, i))}
      {items.length > maxVisible && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show {remaining} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color =
    score >= 80
      ? "#10b981"
      : score >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        {/* Track */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/40"
        />
        {/* Fill */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span
          className={cn("text-2xl font-bold leading-none", getScoreColor(score))}
        >
          {score}
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  );
}

// ─── Score Trend ──────────────────────────────────────────────────────────────

function ScoreTrend({ history }: { history: ScoreHistoryEntry[] }) {
  if (history.length < 2) return null;

  const last = history[history.length - 1].score;
  const prev = history[history.length - 2].score;
  const diff = last - prev;

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      {diff > 0 ? (
        <>
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">
            +{diff} from last check
          </span>
        </>
      ) : diff < 0 ? (
        <>
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          <span className="text-red-600 dark:text-red-400">
            {diff} from last check
          </span>
        </>
      ) : (
        <>
          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">No change</span>
        </>
      )}
    </div>
  );
}

// ─── Score History Sparkline ──────────────────────────────────────────────────

function ScoreSparkline({ history }: { history: ScoreHistoryEntry[] }) {
  if (history.length < 2) return null;

  const w = 120;
  const h = 32;
  const pad = 2;

  const scores = history.map((h) => h.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2);
    const y = h - pad - ((s - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const lastScore = scores[scores.length - 1];
  const lineColor =
    lastScore >= 80 ? "#10b981" : lastScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] text-muted-foreground">Score trend</p>
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.8"
        />
        {points.map((pt, i) => {
          const [x, y] = pt.split(",").map(Number);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2.5"
              fill={lineColor}
              opacity="0.9"
            />
          );
        })}
      </svg>
    </div>
  );
}

// ─── Metadata Tabs ────────────────────────────────────────────────────────────

type MetaTab = "tags" | "descriptions" | "summaries";

function MetadataSection({
  missingTags,
  missingDescriptions,
  missingSummaries,
}: {
  missingTags: MetadataIssue[];
  missingDescriptions: MetadataIssue[];
  missingSummaries: MetadataIssue[];
}) {
  const [activeTab, setActiveTab] = useState<MetaTab>("tags");

  const tabs: { key: MetaTab; label: string; count: number }[] = [
    { key: "tags", label: "Missing Tags", count: missingTags.length },
    {
      key: "descriptions",
      label: "Descriptions",
      count: missingDescriptions.length,
    },
    { key: "summaries", label: "Summaries", count: missingSummaries.length },
  ];

  const activeItems: MetadataIssue[] =
    activeTab === "tags"
      ? missingTags
      : activeTab === "descriptions"
      ? missingDescriptions
      : missingSummaries;

  return (
    <SectionCard>
      <SectionHeader icon={Tags} title="Missing Metadata" color="text-blue-500" />

      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`health-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                tab.count === 0
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-600"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <CollapsibleList
        items={activeItems}
        emptyLabel={`No bookmarks with missing ${activeTab}.`}
        renderItem={(item) => {
          const issue = item as MetadataIssue;
          return (
            <IssueRow key={issue.id} title={issue.title} url={issue.url} />
          );
        }}
      />
    </SectionCard>
  );
}

// ─── Idle State ───────────────────────────────────────────────────────────────

function IdleState({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <HeartPulse className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mb-1 text-base font-semibold">Ready to Diagnose</h3>
      <p className="mb-5 max-w-sm text-sm text-muted-foreground">
        Run a health check to detect duplicate bookmarks, broken links, and
        missing metadata — then get your personalised health score.
      </p>
      <Button id="health-check-run-btn" onClick={onRun}>
        <HeartPulse className="mr-2 h-4 w-4" />
        Run Health Check
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookmarkHealthCheck() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const runCheck = useCallback(async (refresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = refresh
        ? "/api/health-check?refresh=1"
        : "/api/health-check";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as { message?: string }).message ||
            "Failed to run health check."
        );
      }
      setReport(data as HealthReport);
      setHasRun(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkedDate = report
    ? new Date(report.checkedAt).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <section aria-label="Bookmark Health Check" className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
            <HeartPulse className="h-4 w-4 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold">🩺 Bookmark Health</h2>
        </div>
        {hasRun && (
          <Button
            id="health-check-refresh-btn"
            variant="outline"
            size="sm"
            onClick={() => runCheck(true)}
            disabled={isLoading}
            aria-label="Re-run health check"
          >
            <RefreshCw
              className={cn("mr-2 h-3.5 w-3.5", isLoading && "animate-spin")}
            />
            {isLoading ? "Checking…" : "Re-run"}
          </Button>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <h3 className="text-base font-semibold">Analysing Your Library…</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Checking for duplicates, broken links, and missing metadata.
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Health check failed</p>
            <p className="mt-0.5 text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => runCheck(false)}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* ── Idle (no run yet) ── */}
      {!isLoading && !hasRun && !error && (
        <IdleState onRun={() => runCheck(false)} />
      )}

      {/* ── Results ── */}
      {!isLoading && hasRun && report && (
        <div className="space-y-4">
          {/* Score Card */}
          <SectionCard
            className={cn("border", getScoreBg(report.healthScore))}
          >
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <ScoreRing score={report.healthScore} />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Health Score
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-2xl font-bold",
                    getScoreColor(report.healthScore)
                  )}
                >
                  {getScoreLabel(report.healthScore)}
                </p>
                <ScoreTrend history={report.scoreHistory} />
                {checkedDate && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Last checked: {checkedDate} · cached 6 hours
                  </p>
                )}
              </div>
              {/* Sparkline */}
              <div className="hidden sm:block">
                <ScoreSparkline history={report.scoreHistory} />
              </div>
            </div>
          </SectionCard>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Duplicates",
                value: report.duplicateGroups.length,
                icon: Copy,
                color: "text-orange-500",
                bg: "bg-orange-500/10",
              },
              {
                label: "Broken Links",
                value: report.brokenLinks.length,
                icon: Link2Off,
                color: "text-red-500",
                bg: "bg-red-500/10",
              },
              {
                label: "No Tags",
                value: report.missingTags.length,
                icon: Tags,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                label: "No Summary",
                value: report.missingSummaries.length,
                icon: Info,
                color: "text-violet-500",
                bg: "bg-violet-500/10",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm"
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg",
                    bg
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", color)} />
                </div>
                <div>
                  <p
                    className={cn(
                      "text-lg font-bold leading-none",
                      value === 0 ? "text-emerald-500" : color
                    )}
                  >
                    {value}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 2-col grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Duplicate Bookmarks */}
            <SectionCard>
              <SectionHeader
                icon={Copy}
                title="Duplicate Bookmarks"
                count={report.duplicateGroups.length}
                color="text-orange-500"
                countColor="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300"
              />
              <CollapsibleList
                items={report.duplicateGroups}
                emptyLabel="No duplicate bookmarks found."
                renderItem={(item) => {
                  const group = item as DuplicateGroup;
                  return (
                    <div
                      key={group.normalizedUrl}
                      className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {group.bookmarks.length} duplicates
                      </p>
                      {group.bookmarks.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-start justify-between gap-2"
                        >
                          <p className="truncate text-xs font-medium text-foreground">
                            {b.title}
                          </p>
                          <a
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
            </SectionCard>

            {/* Broken Links */}
            <SectionCard>
              <SectionHeader
                icon={Link2Off}
                title="Broken Links"
                count={report.brokenLinks.length}
                color="text-red-500"
              />
              <CollapsibleList
                items={report.brokenLinks}
                emptyLabel="All links are reachable."
                renderItem={(item) => {
                  const link = item as BrokenLink;
                  return (
                    <IssueRow
                      key={link.id}
                      title={link.title}
                      url={link.url}
                      badge={
                        <span className="shrink-0 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                          {getStatusLabel(link.status)}
                        </span>
                      }
                    />
                  );
                }}
              />
            </SectionCard>
          </div>

          {/* Missing Metadata */}
          <MetadataSection
            missingTags={report.missingTags}
            missingDescriptions={report.missingDescriptions}
            missingSummaries={report.missingSummaries}
          />

          {/* Recommendations */}
          <SectionCard className="border-primary/20 bg-primary/5">
            <SectionHeader
              icon={Lightbulb}
              title="Recommendations"
              color="text-primary"
            />
            {report.recommendations.length > 0 ? (
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    {report.healthScore >= 90 ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                No recommendations — your library looks great!
              </p>
            )}
          </SectionCard>

          {/* Score History */}
          {report.scoreHistory.length >= 2 && (
            <SectionCard>
              <SectionHeader
                icon={Activity}
                title="Score History"
                color="text-violet-500"
              />
              <div className="space-y-2">
                {[...report.scoreHistory]
                  .reverse()
                  .slice(0, 5)
                  .map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-muted-foreground">
                        {new Date(entry.checkedAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      <div className="flex flex-1 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              entry.score >= 80
                                ? "bg-emerald-500"
                                : entry.score >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${entry.score}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "w-8 text-right font-semibold",
                            getScoreColor(entry.score)
                          )}
                        >
                          {entry.score}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </section>
  );
}
