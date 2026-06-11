import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Context for a single bookmark sent to Gemini.
 * Includes all fields needed for both QA and recommendation modes.
 */
export interface BookmarkContext {
  title: string;
  description?: string;
  summary?: string;
  tags: string[];
  url?: string;
  createdAt?: string;
}

/**
 * Ask the Gemini 2.5 Flash model a question about the user's bookmark collection.
 *
 * @param question - The natural-language question from the user.
 * @param bookmarks - Array of bookmark context objects (max 50).
 * @returns AI-generated answer string.
 */
export async function askBookmarkAssistant(
  question: string,
  bookmarks: BookmarkContext[]
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  if (!question.trim()) {
    throw new Error("Question cannot be empty.");
  }

  // Limit to 50 bookmarks as per requirements
  const limitedBookmarks = bookmarks.slice(0, 50);

  // Format bookmark data as a structured, readable list for the prompt
  const bookmarkList =
    limitedBookmarks.length > 0
      ? limitedBookmarks
          .map((b, i) => {
            const tags = b.tags.length > 0 ? b.tags.join(", ") : "none";
            const summary = b.summary || "No summary available";
            const description = b.description || "";
            const url = b.url || "";
            // Format ISO date as a readable date string (YYYY-MM-DD)
            let createdAt = "Unknown";
            if (b.createdAt) {
              try {
                createdAt = new Date(b.createdAt).toISOString().slice(0, 10);
              } catch {
                createdAt = b.createdAt;
              }
            }

            const lines = [
              `${i + 1}. Title: ${b.title}`,
              `   Tags: ${tags}`,
              `   Summary: ${summary}`,
            ];
            if (description) lines.push(`   Description: ${description}`);
            if (url) lines.push(`   URL: ${url}`);
            lines.push(`   Saved: ${createdAt}`);
            return lines.join("\n");
          })
          .join("\n\n")
      : "No bookmarks available.";

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `\
You are an intelligent AI Bookmark Assistant and Personalized Recommendation Engine.
Today's date is ${today}.
You have access to the user's complete bookmark collection listed below.

=== BOOKMARK COLLECTION (up to 50 most recent) ===
${bookmarkList}
=== END OF COLLECTION ===

The user asks: "${question}"

## YOUR CAPABILITIES

You handle TWO types of requests — answer whichever applies:

### 1. GENERAL BOOKMARK QUESTIONS
For questions about what the user has saved, searches by tag/topic, or time-based queries:
- Use the "Saved" date to answer: newest, oldest, recently added, this week/month.
- Search across title, tags, summary, and description.
- List matching bookmarks by title.
- If multiple match, show all of them.

### 2. RECOMMENDATION & LEARNING PATH REQUESTS
For questions like "recommend", "what should I learn", "learning path", "suggest", 
"most useful", "best resources", "what to read next", "improve skills":

Follow this structured approach:

a) **Detect Interests** — Analyse tags, titles, and summaries to identify the user's
   dominant topics and interests (e.g. JavaScript, Machine Learning, Design, DSA).

b) **Group by Topic** — Mentally cluster bookmarks into logical topic groups.

c) **Recommend with Reasoning** — For each recommended bookmark, explain WHY it is
   recommended using this exact format:

   **1. [Bookmark Title]**
   Reason:
   - [Specific reason linked to the user's detected interests]
   - [What skill or knowledge it develops]
   - [Any relationship to other bookmarks in the collection]

d) **Suggest Learning Order** — When relevant, propose a logical sequence
   (beginner → intermediate → advanced) based on the bookmark content.

e) **Highlight Gaps** — If the user asks about improving a skill, mention if their
   collection seems to lack resources in a related subtopic.

## STRICT RULES
- ONLY reference bookmarks from the collection above. NEVER invent titles or URLs.
- Use the "Saved" date when discussing recent resources or learning timelines.
- Prefer educational and skill-building bookmarks for recommendation questions.
- Format all lists with bullet points or numbered items for readability.
- Bold bookmark titles using **Title** syntax.
- Be concise, friendly, and actionable.
- If the question is unrelated to bookmarks, politely redirect to bookmark topics.
`;
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  if (!text) {
    throw new Error("No response received from Gemini.");
  }

  return text;
}
