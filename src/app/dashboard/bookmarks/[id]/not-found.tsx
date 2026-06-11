import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function BookmarkNotFound() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center space-y-6 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <h2 className="text-2xl font-semibold">Bookmark Not Found</h2>
      <p className="text-muted-foreground">
        The bookmark you're looking for doesn't exist or has been removed.
      </p>
      <Link href="/dashboard/bookmarks">
        <Button className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Bookmarks
        </Button>
      </Link>
    </div>
  );
} 