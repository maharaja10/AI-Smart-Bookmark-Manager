import BookmarkHealthCheck from "@/components/dashboard/BookmarkHealthCheck";

export const metadata = {
  title: "Bookmark Health Check | Bookmark Manager",
  description:
    "Diagnose your bookmark library for duplicates, broken links, and missing metadata.",
};

export default function HealthCheckPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🩺 Bookmark Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Diagnose your library for duplicate bookmarks, broken links, and
          missing metadata — then track your health score over time.
        </p>
      </div>
      <BookmarkHealthCheck />
    </div>
  );
}
