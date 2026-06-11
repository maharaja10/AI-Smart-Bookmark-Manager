import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function suggestTags(
  url: string,
  title: string,
  description: string
): Promise<string[]> {
  const retryDelaysMs = [1000, 2000, 4000];
  const getStatusCode = (err: unknown): number | undefined => {
    if (!err || typeof err !== "object") {
      return undefined;
    }

    const anyError = err as {
      status?: number;
      statusCode?: number;
      code?: number;
      response?: { status?: number };
    };

    return (
      anyError.status ??
      anyError.statusCode ??
      anyError.code ??
      anyError.response?.status
    );
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    if (!process.env.GEMINI_API_KEY) {
      return [];
    }

    const prompt = `
Generate 3-5 relevant tags for a bookmark.

URL: ${url}
Title: ${title}
Description: ${description}

Return ONLY a valid JSON array.

Example:
["react", "javascript", "frontend", "web-development"]
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
      try {
        const result = await model.generateContent(prompt);
        const content = result.response.text().trim();

        const jsonMatch = content.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          try {
            const tags = JSON.parse(jsonMatch[0]);
            const finalTags = Array.isArray(tags) ? tags.slice(0, 5) : [];
            return finalTags;
          } catch (error) {
            console.error("Error parsing tags JSON:", error);
            return [];
          }
        }

        return [];
      } catch (error) {
        const statusCode = getStatusCode(error);
        const shouldRetry = statusCode === 429 || statusCode === 503;

        if (shouldRetry && attempt < retryDelaysMs.length) {
          const retryAttempt = attempt + 1;
          const delayMs = retryDelaysMs[attempt];
          await delay(delayMs);
          continue;
        }

        console.error("Error suggesting tags:", error);
        return [];
      }
    }

    return [];
  } catch (error) {
    console.error("Error suggesting tags:", error);
    return [];
  }
}

export async function generateSummary(
  url: string,
  title: string,
  description: string
): Promise<string> {
  const fallback = description || "";

  try {
    if (!process.env.GEMINI_API_KEY) {
      return fallback;
    }

    const prompt = `
Write a concise 40-80 word summary for this bookmark.

URL: ${url}
Title: ${title}
Description: ${description}

Return plain text only.
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    if (!content) {
      return fallback;
    }

    return content.replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("Error generating summary:", error);
    return fallback;
  }
}

export async function parseSearchQuery(
  query: string
): Promise<{ keywords: string[] }> {
  const fallback = { keywords: [query] };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return fallback;
    }

    const prompt = `
Convert the search query into JSON with a "keywords" array.

Rules:
- Return ONLY JSON.
- Use lowercase keywords.
- Keep keywords short (1-2 words).
- Do not include extra fields.

Input: "${query}"
Output:
{"keywords": ["example"]}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    const fencedMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/i);
    const inlineMatch = content.match(/{[\s\S]*}/);
    const jsonText = (fencedMatch?.[1] || inlineMatch?.[0] || content).trim();

    const parsed = JSON.parse(jsonText) as { keywords?: string[] };
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];

    if (keywords.length === 0) {
      return fallback;
    }

    return {
      keywords: keywords.map((keyword) => keyword.toLowerCase()),
    };
  } catch (error) {
    console.error("Error parsing search query:", error);
    return fallback;
  }
}