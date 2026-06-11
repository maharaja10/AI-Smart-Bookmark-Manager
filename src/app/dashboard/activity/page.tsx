import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Log | Bookmark Manager",
  description: "View a detailed historical audit log of all your bookmarks.",
};

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <ActivityTimeline />
    </div>
  );
}
