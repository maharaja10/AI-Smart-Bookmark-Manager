"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type FormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const featureHighlights = [
    "AI Tag Suggestions",
    "Smart Search",
    "Rich Link Previews",
    "Folder Management",
  ];

  const stats = ["AI Powered", "Smart Search", "Secure Storage", "Rich Previews"];

  const inputClassName =
    "w-full rounded-md border border-input bg-background/90 px-3 py-2 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background";

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
        setIsLoading(false);
        return;
      }

      toast.success("Login successful!");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-muted/30 transition-colors duration-300 dark:to-slate-950">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="relative overflow-hidden bg-gradient-to-br from-sky-200/80 via-cyan-200/70 to-sky-100/80 px-6 py-12 text-slate-900 transition-colors duration-300 dark:from-blue-950 dark:via-cyan-700 dark:to-emerald-500 dark:text-white lg:px-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/70 blur-3xl dark:bg-white/10" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/60 blur-3xl dark:bg-white/10" />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent dark:from-white/5" />

          <div className="relative z-10 flex h-full flex-col justify-center gap-8 lg:gap-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-700 shadow-sm dark:bg-white/15 dark:text-white/90">
                AI-Powered
              </div>
              <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">
                AI-Powered Smart Bookmark Manager
              </h1>
              <p className="max-w-xl text-base text-slate-700 lg:text-lg dark:text-white/85">
                Save, organize, summarize, and discover links using AI-powered tagging, smart categorization, rich previews, and intelligent search.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700 dark:text-white/80">
              {stats.map((stat) => (
                <span
                  key={stat}
                  className="rounded-full border border-white/40 bg-white/60 px-3 py-1 shadow-sm dark:border-white/15 dark:bg-white/10"
                >
                  {stat}
                </span>
              ))}
            </div>

            <div className="grid max-w-lg gap-4 text-sm text-slate-800 dark:text-white/90">
              {featureHighlights.map((feature) => (
                <div
                  key={feature}
                  className="group flex items-center gap-3 rounded-lg border border-white/40 bg-white/70 px-4 py-3 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-700 shadow-sm transition group-hover:bg-white dark:bg-white/15 dark:text-white">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold tracking-tight">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-md space-y-8 rounded-2xl border border-border/70 bg-card/80 p-8 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] backdrop-blur transition-colors duration-300 dark:bg-slate-900/70 dark:shadow-[0_30px_90px_-40px_rgba(0,0,0,0.7)]">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Welcome back
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">Sign in to your workspace</h2>
              <p className="text-sm text-muted-foreground">
                Enter your credentials to access your bookmarks and analytics.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={inputClassName}
                  placeholder="your@email.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={inputClassName}
                    placeholder="••••••••"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-primary hover:underline">
                Register
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 