interface ClassifiableBookmark {
  title: string;
  description?: string;
  summary?: string;
  tags: string[];
}

interface ClassificationResult {
  suggestedFolder: string;
  confidence: number;
}

/**
 * Classifies a bookmark into one of the default folder categories
 * based on rules matching keywords in tags, title, description, and summary.
 * Structured to be easily swapped with Gemini 2.5 Flash in the future.
 *
 * @param bookmark The bookmark content to classify.
 * @returns Object containing the suggested folder name and confidence level.
 */
export async function classifyBookmark(
  bookmark: ClassifiableBookmark
): Promise<ClassificationResult> {
  const title = (bookmark.title || "").toLowerCase();
  const description = (bookmark.description || "").toLowerCase();
  const summary = (bookmark.summary || "").toLowerCase();
  const tags = (bookmark.tags || []).map((t) => t.toLowerCase());

  // Special rule for GitHub profiles / developer portfolios
  if (
    title.includes("github") ||
    tags.includes("github") ||
    tags.includes("profile") ||
    tags.includes("developer")
  ) {
    return {
      suggestedFolder: "Career",
      confidence: 90,
    };
  }

  // Define keyword mapping groups for categories
  const rules = [
    {
      category: "Frontend",
      confidence: 95,
      keywords: [
        "react",
        "javascript",
        "frontend",
        "nextjs",
        "vue",
        "angular",
        "svelte",
        "html",
        "css",
        "tailwind",
        "bootstrap",
        "web-development",
        "webdev",
      ],
    },
    {
      category: "Backend",
      confidence: 95,
      keywords: [
        "node",
        "express",
        "api",
        "backend",
        "django",
        "flask",
        "spring",
        "graphql",
        "rest",
        "go",
        "golang",
        "rust",
        "microservices",
      ],
    },
    {
      category: "AI & ML",
      confidence: 95,
      keywords: [
        "ai",
        "ml",
        "generative-ai",
        "machine-learning",
        "llm",
        "gemini",
        "openai",
        "gpt",
        "neural-network",
        "deep-learning",
        "nlp",
        "vision",
      ],
    },
    {
      category: "DSA",
      confidence: 95,
      keywords: [
        "dsa",
        "algorithms",
        "leetcode",
        "skillrack",
        "data-structures",
        "geeksforgeeks",
        "hackerrank",
        "coding-challenges",
      ],
    },
    {
      category: "DevOps",
      confidence: 95,
      keywords: [
        "docker",
        "aws",
        "cloud",
        "devops",
        "kubernetes",
        "ci-cd",
        "jenkins",
        "actions",
        "terraform",
        "gcp",
        "azure",
        "serverless",
      ],
    },
    {
      category: "Career",
      confidence: 90,
      keywords: [
        "placement",
        "career",
        "interview",
        "resume",
        "job",
        "internship",
        "interview-preparation",
        "interview-prep",
      ],
    },
    {
      category: "Design",
      confidence: 90,
      keywords: [
        "figma",
        "ui",
        "ux",
        "design",
        "wireframe",
        "typography",
        "illustration",
      ],
    },
    {
      category: "Programming",
      confidence: 90,
      keywords: [
        "coding",
        "programming",
        "github",
        "git",
        "code",
        "software",
        "development",
        "python",
        "cpp",
        "java",
        "csharp",
      ],
    },
    {
      category: "Social Media",
      confidence: 85,
      keywords: [
        "instagram",
        "twitter",
        "linkedin",
        "social",
        "facebook",
        "youtube",
        "tiktok",
      ],
    },
  ];

  // 1. Check direct matches in tags (highest signal)
  for (const rule of rules) {
    if (tags.some((tag) => rule.keywords.includes(tag))) {
      return {
        suggestedFolder: rule.category,
        confidence: rule.confidence,
      };
    }
  }

  // 2. Check title content matches
  for (const rule of rules) {
    if (rule.keywords.some((kw) => title.includes(kw))) {
      return {
        suggestedFolder: rule.category,
        confidence: rule.confidence - 5, // slightly less confident if only matching text title
      };
    }
  }

  // 3. Check description and summary content matches
  for (const rule of rules) {
    const textToCheck = `${description} ${summary}`;
    if (rule.keywords.some((kw) => textToCheck.includes(kw))) {
      return {
        suggestedFolder: rule.category,
        confidence: rule.confidence - 10, // lower confidence for body matches
      };
    }
  }

  // 4. Default fallback category
  return {
    suggestedFolder: "Other",
    confidence: 70,
  };
}
