import { useState, useEffect, useCallback } from "react";

export interface TagItem {
  name: string;
  count: number;
}

export function useTags(initialTags?: TagItem[]) {
  const [tags, setTags] = useState<TagItem[]>(initialTags || []);
  const [loading, setLoading] = useState(!initialTags);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tags");
      if (!res.ok) {
        throw new Error("Failed to fetch tags");
      }
      const data = await res.json();
      setTags(data.tags || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialTags || initialTags.length === 0) {
      fetchTags();
    }
  }, [initialTags, fetchTags]);

  return { tags, loading, error, refetch: fetchTags };
}
