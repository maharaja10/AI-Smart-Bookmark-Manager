"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Bot, Send, User, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Very lightweight markdown → JSX: bold, bullets, line-breaks */
function renderContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bullet point
    if (line.match(/^[-•*]\s/)) {
      return (
        <li key={i} className="ml-4 list-disc">
          {renderInline(line.replace(/^[-•*]\s/, ""))}
        </li>
      );
    }
    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      return (
        <li key={i} className="ml-4 list-decimal">
          {renderInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
    }
    // Blank line → spacer
    if (!line.trim()) {
      return <div key={i} className="h-2" />;
    }
    return <p key={i}>{renderInline(line)}</p>;
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WelcomeBanner() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">AI Bookmark Assistant</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ask questions about your bookmarks or get personalized recommendations
        — discover learning paths, find top resources, and understand your
        interests.
      </p>

      <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <ExampleChip key={prompt} text={prompt} />
        ))}
      </div>
    </div>
  );
}

function ExampleChip({ text }: { text: string }) {
  // Expose click via a custom event bubbled up (simpler than prop drilling)
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("assistant:prompt", { detail: text }));
  };

  return (
    <button
      onClick={handleClick}
      className="rounded-lg border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
    >
      {text}
    </button>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "group relative max-w-[75%] space-y-1 rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-card text-card-foreground ring-1 ring-border"
        )}
      >
        <div className={cn("prose-sm", isUser ? "" : "")}>
          {renderContent(message.content)}
        </div>
        <p
          className={cn(
            "mt-1 text-[10px]",
            isUser ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-card px-4 py-3 ring-1 ring-border">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  "Recommend bookmarks I should read next",
  "What should I learn next?",
  "Suggest a learning path",
  "Which resources help coding skills?",
  "Recommend my best bookmarks",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Listen for example chip clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      setInput(text);
      inputRef.current?.focus();
    };
    window.addEventListener("assistant:prompt", handler);
    return () => window.removeEventListener("assistant:prompt", handler);
  }, []);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to get a response.");
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* ── Page header ── */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">AI Assistant</h1>
          <p className="text-xs text-muted-foreground">
            Powered by Gemini 2.5 Flash · recommendations &amp; bookmark insights
          </p>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
        {/* Messages scroll container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {isEmpty ? (
            <WelcomeBanner />
          ) : (
            <div className="mx-auto max-w-2xl space-y-5">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div className="border-t bg-card px-4 py-3">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-2xl items-end gap-2"
          >
            <textarea
              id="assistant-input"
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your bookmarks… (Enter to send, Shift+Enter for new line)"
              rows={1}
              disabled={isLoading}
              aria-label="Ask the AI assistant"
              className={cn(
                "max-h-40 flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm outline-none",
                "placeholder:text-muted-foreground",
                "focus:ring-2 focus:ring-primary/50",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "transition-shadow duration-150"
              )}
            />
            <Button
              id="assistant-send-btn"
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              aria-label="Send question"
              className="h-10 w-10 shrink-0 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
            AI responses are based on your saved bookmarks only.
          </p>
        </div>
      </div>
    </div>
  );
}
