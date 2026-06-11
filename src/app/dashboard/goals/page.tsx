import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import { generateProductivitySummary } from "@/lib/productivity";
import GoalList from "@/components/dashboard/GoalList";
import AchievementGallery from "@/components/dashboard/AchievementGallery";
import TagProgressList from "@/components/dashboard/TagProgressList";
import { Flame, BookOpen, Target, Lightbulb, TrendingUp, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Goals & Productivity | Bookmark Manager",
  description:
    "Track your learning goals, achievements, streaks, and reading progress in the Goals & Productivity dashboard.",
};

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  await connectDB();

  const summary = await generateProductivitySummary(session.user.id);

  const {
    readingStats,
    streaks,
    tagProgressList,
    activeGoals,
    allBadges,
    insights,
  } = summary;

  // Serialize goals (already plain objects from productivity service)
  const goalsForClient = activeGoals;

  // Filter non-empty tags only
  const nonEmptyTags = tagProgressList.filter((t) => t.totalCount > 0);

  return (
    <div className="space-y-8">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Target className="h-7 w-7 text-primary" />
          Goals &amp; Productivity
        </h1>
        <p className="text-muted-foreground text-sm">
          Track your learning goals, reading streaks, achievements, and topic progress.
        </p>
      </div>

      {/* ── Hero Stats Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Current Streak"
          value={`${streaks.currentStreak}d`}
          sub={`Best: ${streaks.bestStreak}d`}
          Icon={Flame}
          iconClass="text-orange-500"
        />
        <StatCard
          label="Best Streak"
          value={`${streaks.bestStreak}d`}
          sub="All time"
          Icon={TrendingUp}
          iconClass="text-amber-500"
        />
        <StatCard
          label="Total Read"
          value={readingStats.totalRead}
          sub={`${readingStats.readPercentage}% completion`}
          Icon={BookOpen}
          iconClass="text-emerald-500"
        />
        <StatCard
          label="Read This Week"
          value={readingStats.readThisWeek}
          sub="Last 7 days"
          Icon={CheckCircle}
          iconClass="text-teal-500"
        />
        <StatCard
          label="Read This Month"
          value={readingStats.readThisMonth}
          sub="Last 30 days"
          Icon={CheckCircle}
          iconClass="text-cyan-500"
        />
        <StatCard
          label="Active Goals"
          value={goalsForClient.length}
          sub={`${allBadges.filter((b) => b.earned).length} badges earned`}
          Icon={Target}
          iconClass="text-primary"
        />
      </div>

      {/* ── Reading Progress Bar ────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            Overall Reading Completion
          </h2>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {readingStats.readPercentage}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${readingStats.readPercentage}%` }}
          />
        </div>
        <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{readingStats.totalRead}</span> read
          </span>
          <span>
            <span className="font-semibold">{readingStats.totalUnread}</span> unread
          </span>
          <span>
            <span className="font-semibold">{readingStats.readThisWeek}</span> this week
          </span>
          <span>
            <span className="font-semibold">{readingStats.readThisMonth}</span> this month
          </span>
        </div>
      </div>

      {/* ── Smart Insights ──────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="rounded-lg border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2 border-b pb-3">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Smart Insights
          </h2>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Goals List (Client Component) ───────────────────────────────── */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
      <GoalList initialGoals={goalsForClient} />
      </div>

      {/* ── Tag Progress (only shown if user has bookmarks with known tags) */}
      {nonEmptyTags.length > 0 && (
        <TagProgressList tagProgressList={nonEmptyTags} />
      )}

      {/* ── Achievements Gallery ─────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <AchievementGallery badges={allBadges} />
      </div>
    </div>
  );
}

// ── Stat Card helper ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  Icon,
  iconClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  Icon: React.ElementType;
  iconClass?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm flex flex-col gap-1 hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${iconClass ?? "text-primary"}`} />
      </div>
      <span className="text-2xl font-bold text-foreground leading-tight">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}
