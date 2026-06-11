import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Tag } from "lucide-react";
import { getUserTags } from "@/lib/tags";

interface TagWithCount {
  name: string;
  count: number;
}

export default async function TagsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Loading...</div>;
  }
  
  // Get all tags with counts
  const tags = await getUserTags(session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tags</h1>
      
      {tags.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <Link
              key={tag.name}
              href={`/dashboard/bookmarks?tag=${encodeURIComponent(tag.name)}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Tag className="h-4 w-4" />
                </div>
                <span className="font-medium">{tag.name}</span>
              </div>
              <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                {tag.count}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            You don&apos;t have any tags yet
          </p>
          <Link
            href="/dashboard/bookmarks/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Add a bookmark with tags
          </Link>
        </div>
      )}
    </div>
  );
} 