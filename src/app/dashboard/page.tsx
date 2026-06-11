import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import Folder from "@/models/Folder";
import User from "@/models/User";
import BookmarkGrid from "@/components/dashboard/BookmarkGrid";
import AIInsights from "@/components/dashboard/AIInsights";
import BookmarkHealthCheck from "@/components/dashboard/BookmarkHealthCheck";
import BookmarkAnalytics from "@/components/dashboard/BookmarkAnalytics";
import RecentActivityWidget from "@/components/dashboard/RecentActivityWidget";
import ProductivityWidget from "@/components/dashboard/ProductivityWidget";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div>Loading...</div>;
  }
  
  await connectDB();

  // Check user preferences for default landing page redirect.
  const user = await User.findById(session.user.id).select("preferences").lean() as any;
  if (user?.preferences) {
    try {
      const prefs = JSON.parse(user.preferences);
      if (prefs.defaultLandingPage && prefs.defaultLandingPage !== "/dashboard") {
        redirect(prefs.defaultLandingPage);
      }
    } catch (e) {
      // Ignore parse error
    }
  }
  
  // Get bookmark stats
  const totalBookmarks = await Bookmark.countDocuments({ userId: session.user.id });
  const favoriteBookmarks = await Bookmark.countDocuments({ 
    userId: session.user.id,
    isFavorite: true 
  });
  const readLaterBookmarks = await Bookmark.countDocuments({ 
    userId: session.user.id,
    isReadLater: true 
  });
  const totalFolders = await Folder.countDocuments({ userId: session.user.id });
  
  // Get recent bookmarks
  const rawRecentBookmarks = (await Bookmark.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean()) as unknown as Array<any>;
  
  const recentBookmarks = rawRecentBookmarks.map((bookmark) => ({
    _id: String(bookmark._id),
    title: bookmark.title,
    url: bookmark.url,
    description: bookmark.description || "",
    summary: bookmark.summary || "",
    tags: bookmark.tags || [],
    ogImage: bookmark.ogImage || "",
    isFavorite: Boolean(bookmark.isFavorite),
    isReadLater: Boolean(bookmark.isReadLater),
    createdAt: bookmark.createdAt?.toISOString() || new Date().toISOString(),
  }));
  
  // Get favorite bookmarks
  const rawFavorites = (await Bookmark.find({ 
    userId: session.user.id,
    isFavorite: true 
  })
    .sort({ updatedAt: -1 })
    .limit(4)
    .lean()) as unknown as Array<any>;
  
  const favorites = rawFavorites.map((bookmark) => ({
    _id: String(bookmark._id),
    title: bookmark.title,
    url: bookmark.url,
    description: bookmark.description || "",
    summary: bookmark.summary || "",
    tags: bookmark.tags || [],
    ogImage: bookmark.ogImage || "",
    isFavorite: Boolean(bookmark.isFavorite),
    isReadLater: Boolean(bookmark.isReadLater),
    createdAt: bookmark.createdAt?.toISOString() || new Date().toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/dashboard/bookmarks/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Bookmark
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Bookmarks" value={totalBookmarks} />
        <StatCard title="Favorites" value={favoriteBookmarks} />
        <StatCard title="Read Later" value={readLaterBookmarks} />
        <StatCard title="Folders" value={totalFolders} />
      </div>

      {/* AI Insights */}
      <AIInsights />

      {/* Bookmark Health Check */}
      <BookmarkHealthCheck />

      {/* Analytics Summary Widget */}
      <BookmarkAnalytics />

      {/* Productivity Overview Widget */}
      <ProductivityWidget />

      {/* Recent Activity Widget */}
      <RecentActivityWidget />
      
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Bookmarks</h2>
          <Link href="/dashboard/bookmarks" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {recentBookmarks.length > 0 ? (
          <BookmarkGrid bookmarks={recentBookmarks} />
        ) : (
          <EmptyState 
            message="You don't have any bookmarks yet." 
            action={
              <Link href="/dashboard/bookmarks/new">
                <Button>Add your first bookmark</Button>
              </Link>
            }
          />
        )}
      </div>
      
      {favorites.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Favorites</h2>
            <Link href="/dashboard/bookmarks?filter=favorite" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <BookmarkGrid bookmarks={favorites} />
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <p className="mb-4 text-muted-foreground">{message}</p>
      {action}
    </div>
  );
} 