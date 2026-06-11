"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { Target, Calendar, Plus, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Goal {
  _id: string;
  title: string;
  goalType: string;
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  percentComplete: number;
  completed: boolean;
}

interface GoalListProps {
  initialGoals: Goal[];
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  bookmarks_saved: "Bookmarks Saved",
  bookmarks_read: "Bookmarks Read",
  favorites_added: "Favorites Added",
  readlater_completed: "Read Later Completed",
  custom_learning: "Custom Learning Goal",
};

export default function GoalList({ initialGoals }: GoalListProps) {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState("bookmarks_read");
  const [targetValue, setTargetValue] = useState(10);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || targetValue <= 0) {
      toast.error("Please provide a valid title and target value.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          goalType,
          targetValue,
          startDate,
          endDate,
        }),
      });

      if (!res.ok) throw new Error("Failed to create goal");
      
      const newGoal = await res.json();
      setGoals((prev) => [newGoal, ...prev]);
      toast.success("Goal created successfully!");
      setTitle("");
      setShowAddForm(false);
      router.refresh();
    } catch (err) {
      toast.error("Failed to create goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");

      setGoals((prev) => prev.filter((g) => g._id !== id));
      toast.success("Goal deleted successfully");
      router.refresh();
    } catch (err) {
      toast.error("Failed to delete goal");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Productivity Goals
        </h2>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          {showAddForm ? "Cancel" : "Add Goal"}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-semibold text-sm">Create New Learning Goal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Goal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Read 15 React articles this month"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Goal Type</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="bookmarks_read">Bookmarks Read</option>
                <option value="bookmarks_saved">Bookmarks Saved</option>
                <option value="favorites_added">Favorites Added</option>
                <option value="readlater_completed">Read Later Completed</option>
                <option value="custom_learning">Custom Learning Goal (Uses tags)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Target Count</label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border bg-transparent px-2 py-1.5 text-xs focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border bg-transparent px-2 py-1.5 text-xs focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Goal"}
            </Button>
          </div>
        </form>
      )}

      {/* Active Goals */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Active Goals ({activeGoals.length})
        </h3>

        {activeGoals.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground bg-muted/20">
            <AlertCircle className="h-8 w-8 mx-auto opacity-45 mb-2" />
            <p className="text-sm">No active goals. Set a goal above to challenge yourself!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeGoals.map((goal) => (
              <div key={goal._id} className="group rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow relative">
                <button
                  onClick={() => handleDelete(goal._id)}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  title="Delete Goal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="pr-6 space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm line-clamp-1">{goal.title}</h4>
                    <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">
                      {GOAL_TYPE_LABELS[goal.goalType] || goal.goalType}
                    </span>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>
                        {goal.currentValue} / {goal.targetValue} ({goal.percentComplete}%)
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {goal.daysRemaining} days left
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 rounded-full"
                        style={{ width: `${goal.percentComplete}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Ends on {new Date(goal.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Completed Goals ({completedGoals.length})
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {completedGoals.map((goal) => (
              <div key={goal._id} className="group rounded-lg border bg-muted/30 p-4 shadow-sm relative flex items-start gap-3 border-emerald-500/20">
                <button
                  onClick={() => handleDelete(goal._id)}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  title="Delete Goal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="pr-6">
                  <h4 className="font-semibold text-muted-foreground text-sm line-through line-clamp-1">
                    {goal.title}
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    Completed {goal.targetValue} / {goal.targetValue}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
