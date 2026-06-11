import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

if (process.env.NODE_ENV === "development") {
  console.log("Gemini API configured");
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal bookmark data needed to generate insights. */
export interface InsightBookmark {
  title: string;
  description?: string;
  summary?: string;
  tags: string[];
  createdAt?: string; // ISO date string
}

/** Structured insights returned by Gemini and the API. */
export interface BookmarkInsights {
  totalBookmarks: number;
  topInterests: string[];
  topTags: string[];
  recommendedSkill: string;
  /** 3-5 bullet reasons explaining why the skill is recommended */
  recommendedSkillReason: string[];
  careerPath: string;
  learningProgress: string[];
  knowledgeGaps: string[];
  learningRoadmap: {
    current: string[];
    next: string[];
    later: string[];
    goal: string;
  };
  /** ISO timestamp of when insights were generated */
  generatedAt: string;
}

// ─── In-process 24-hour cache (per userId) ────────────────────────────────────

interface CacheEntry {
  insights: BookmarkInsights;
  expiresAt: number; // epoch ms
}

const insightsCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getCached(userId: string): BookmarkInsights | null {
  const entry = insightsCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    insightsCache.delete(userId);
    return null;
  }
  return entry.insights;
}

function setCache(userId: string, insights: BookmarkInsights): void {
  insightsCache.set(userId, {
    insights,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a compact text representation of the bookmark collection for the prompt. */
function formatBookmarksForPrompt(bookmarks: InsightBookmark[]): string {
  if (bookmarks.length === 0) return "No bookmarks available.";

  return bookmarks
    .map((b, i) => {
      const tags = b.tags.length > 0 ? b.tags.join(", ") : "none";
      const summary = b.summary || b.description || "No summary";
      let savedOn = "Unknown";
      if (b.createdAt) {
        try {
          savedOn = new Date(b.createdAt).toISOString().slice(0, 10);
        } catch {
          savedOn = b.createdAt;
        }
      }
      return `${i + 1}. ${b.title} | Tags: ${tags} | Saved: ${savedOn}\n   ${summary}`;
    })
    .join("\n\n");
}

/** Parse fenced or inline JSON from Gemini response text. */
function extractJson(raw: string): unknown {
  // Try fenced code block first
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }
  // Fall back to first { ... } block
  const inline = raw.match(/\{[\s\S]*\}/);
  if (inline?.[0]) {
    return JSON.parse(inline[0]);
  }
  return JSON.parse(raw.trim());
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Generate AI insights for a user's bookmark collection.
 * Results are cached in-process for 24 hours per userId.
 *
 * @param userId   - The authenticated user's ID (used as cache key).
 * @param bookmarks - Up to 100 bookmark objects.
 * @param forceRefresh - If true, bypass cache and regenerate.
 */
export async function generateBookmarkInsights(
  userId: string,
  bookmarks: InsightBookmark[],
  forceRefresh = false
): Promise<BookmarkInsights> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  // Return cached result if available
  if (!forceRefresh) {
    const cached = getCached(userId);
    if (cached) return cached;
  }

  const bookmarkList = formatBookmarksForPrompt(bookmarks.slice(0, 100));
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `\
You are an AI analyst for a personal bookmark manager.
Today's date is ${today}.
Analyse the user's bookmark collection below and return structured JSON insights.

=== BOOKMARK COLLECTION (up to 100) ===
${bookmarkList}
=== END ===

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "topInterests": ["string", ...],          // 3-6 broad interest areas detected from tags/titles/summaries
  "topTags": ["string", ...],               // 5-10 most frequently appearing or thematically dominant tags
  "recommendedSkill": "string",             // Single most valuable skill the user should learn next
  "recommendedSkillReason": ["string", ...],// 3-5 bullet reasons explaining the recommendation:
                                            //   - Current strengths detected from their bookmarks
                                            //   - Why this specific skill is the logical next step
                                            //   - How it fills a detected knowledge gap
                                            //   - How it advances their career path
  "careerPath": "string",                   // 1-2 sentence suggested career/learning direction
  "learningProgress": ["string", ...],      // 3-5 observations about what the user has already covered
  "knowledgeGaps": ["string", ...],         // 3-5 important topics missing from the collection
  "learningRoadmap": {                      // A structured learning progression based on bookmarks, interests, gaps, etc.
    "current": ["string", ...],             // 2-4 skills already being learned
    "next": ["string", ...],                // 2-3 skills to learn next immediately
    "later": ["string", ...],               // 2-3 skills for advanced progression later
    "goal": "string"                        // Final career goal/role (e.g. "Full Stack Developer")
  }
}

Rules:
- Base ALL answers strictly on the bookmarks provided.
- Do not invent tags, titles, or topics not present in the data.
- Each recommendedSkillReason item must be a single, complete, human-readable sentence.
- If the collection is empty, use empty arrays and "N/A" strings.
- Return ONLY the JSON object. No preamble, no trailing text.`;

  let result;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    result = await model.generateContent(prompt);

  } catch (error) {

    console.log(
      "Gemini 2.5 Flash unavailable, falling back to Gemini 2.0 Flash"
    );

    const fallbackModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    result = await fallbackModel.generateContent(prompt);
  }

  const raw = result.response.text().trim();

  let parsed: Partial<BookmarkInsights>;
  try {
    parsed = extractJson(raw) as Partial<BookmarkInsights>;
  } catch (err) {
    console.error("Failed to parse Gemini insights JSON:", raw);
    throw new Error("Received malformed JSON from Gemini.");
  }

  const insights: BookmarkInsights = {
    totalBookmarks: bookmarks.length,
    topInterests: Array.isArray(parsed.topInterests) ? parsed.topInterests : [],
    topTags: Array.isArray(parsed.topTags) ? parsed.topTags : [],
    recommendedSkill:
      typeof parsed.recommendedSkill === "string"
        ? parsed.recommendedSkill
        : "N/A",
    recommendedSkillReason: Array.isArray(
      (parsed as Partial<BookmarkInsights>).recommendedSkillReason
    )
      ? (parsed as Partial<BookmarkInsights>).recommendedSkillReason!
      : [],
    careerPath:
      typeof parsed.careerPath === "string" ? parsed.careerPath : "N/A",
    learningProgress: Array.isArray(parsed.learningProgress)
      ? parsed.learningProgress
      : [],
    knowledgeGaps: Array.isArray(parsed.knowledgeGaps)
      ? parsed.knowledgeGaps
      : [],
    learningRoadmap: {
      current:
        parsed.learningRoadmap && Array.isArray(parsed.learningRoadmap.current)
          ? parsed.learningRoadmap.current
          : [],
      next:
        parsed.learningRoadmap && Array.isArray(parsed.learningRoadmap.next)
          ? parsed.learningRoadmap.next
          : [],
      later:
        parsed.learningRoadmap && Array.isArray(parsed.learningRoadmap.later)
          ? parsed.learningRoadmap.later
          : [],
      goal:
        parsed.learningRoadmap && typeof parsed.learningRoadmap.goal === "string"
          ? parsed.learningRoadmap.goal
          : "Not available",
    },
    generatedAt: new Date().toISOString(),
  };

  setCache(userId, insights);
  return insights;
}
