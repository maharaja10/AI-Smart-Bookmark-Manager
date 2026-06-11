import BookmarkAnalytics from "@/components/dashboard/BookmarkAnalytics";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics | Bookmark Manager",
  description:
    "View detailed analytics about your bookmark collection — growth trends, top tags, folder distribution, activity heatmap, and more.",
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <BookmarkAnalytics />
    </div>
  );
}
