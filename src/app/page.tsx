import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Space_Grotesk } from 'next/font/google';
import { BookmarkPlus, Check, Image, Search, ShieldCheck, Sparkles } from 'lucide-react';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

const stats = [
  {
    title: 'AI Powered',
    description: 'Automatic bookmark intelligence',
    Icon: Sparkles,
  },
  {
    title: 'Smart Search',
    description: 'Find bookmarks instantly',
    Icon: Search,
  },
  {
    title: 'Rich Previews',
    description: 'Metadata and content previews',
    Icon: Image,
  },
  {
    title: 'Secure Storage',
    description: 'Protected user workspace',
    Icon: ShieldCheck,
  },
];

const features = [
  {
    title: 'AI Tag Suggestions',
    description: 'Automatically generate relevant tags.',
    icon: '🤖',
  },
  {
    title: 'AI Bookmark Summaries',
    description: 'Generate quick summaries of saved content.',
    icon: '🧠',
  },
  {
    title: 'Smart Folder Management',
    description: 'Organize bookmarks efficiently.',
    icon: '📁',
  },
  {
    title: 'Intelligent Search',
    description: 'Search across titles, URLs, tags, and descriptions.',
    icon: '🔍',
  },
  {
    title: 'Rich Link Previews',
    description: 'Display metadata, favicon, and preview content.',
    icon: '🔗',
  },
  {
    title: 'Secure Authentication',
    description: 'Protected user accounts with secure login.',
    icon: '🔒',
  },
];

const steps = [
  {
    title: 'Save Bookmark',
    description: 'Capture any link in seconds and keep it organized.',
    Icon: BookmarkPlus,
  },
  {
    title: 'AI Organizes Content',
    description: 'Tags, summaries, and folders are generated automatically.',
    Icon: Sparkles,
  },
  {
    title: 'Find Anything Instantly',
    description: 'Search across everything with powerful filters.',
    Icon: Search,
  },
];

const benefits = [
  'Save Time',
  'Stay Organized',
  'Discover Knowledge Faster',
  'AI-Powered Productivity',
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div
      className={`${spaceGrotesk.className} relative min-h-screen bg-gradient-to-br from-background via-background to-muted/30 transition-colors duration-300 dark:to-slate-950`}
    >
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-400 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              AI Bookmarking
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-200/80 via-cyan-200/70 to-sky-100/80 transition-colors duration-300 dark:from-blue-950 dark:via-cyan-800 dark:to-emerald-500" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/70 blur-3xl dark:bg-white/10" />
          <div className="absolute bottom-0 left-0 h-60 w-60 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/60 blur-3xl dark:bg-white/10" />

          <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-28 text-slate-900 dark:text-white lg:flex-row lg:items-center lg:pt-32">
            <div className="flex-1 space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-sm transition-colors dark:bg-white/15 dark:text-white/90">
                ✨ AI-Powered Productivity Tool
              </span>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                AI-Powered Smart Bookmark Manager
              </h1>
              <p className="max-w-2xl text-base text-slate-700 dark:text-white/80 sm:text-lg">
                Save, organize, summarize, and discover links using AI-powered tagging, smart categorization, rich previews, and intelligent search.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/auth/register">
                  <Button size="lg">Get Started</Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex-1">
              <div className="rounded-3xl border border-white/40 bg-white/70 p-6 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur transition-all duration-300 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_30px_90px_-40px_rgba(0,0,0,0.7)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live Preview</p>
                    <h3 className="text-lg font-semibold">Workspace Snapshot</h3>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                    AI Active
                  </span>
                </div>
                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-white/60 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Suggested Tags</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {['ai', 'productivity', 'design', 'research'].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-900/5 px-2.5 py-1 text-slate-700 dark:bg-white/10 dark:text-white/80"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recent Activity</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-white/80">
                      <li className="flex items-center justify-between">
                        <span>Added: Product Hunt</span>
                        <span className="text-xs text-muted-foreground">2m ago</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Saved: Vercel Docs</span>
                        <span className="text-xs text-muted-foreground">18m ago</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Summary generated</span>
                        <span className="text-xs text-muted-foreground">1h ago</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/90 p-5 text-left shadow-sm transition-colors duration-300 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_20px_40px_-30px_rgba(0,0,0,0.8)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <stat.Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{stat.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Features
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">Everything your team needs</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                A modern workspace built for speed, clarity, and AI-powered organization.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900/70"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                  {feature.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              How it works
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">From save to insight in moments</h2>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm transition-colors duration-300 dark:bg-slate-900/70"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Benefits
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">Productivity that compounds</h2>
              <p className="text-sm text-muted-foreground">
                Designed to help you capture knowledge faster, stay organized, and surface the right link when it matters most.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm transition-colors duration-300 dark:bg-slate-900/70">
              <div className="grid gap-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold tracking-tight">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-3xl border border-white/40 bg-gradient-to-br from-sky-200/80 via-cyan-200/70 to-sky-100/80 p-10 text-slate-900 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.35)] transition-colors duration-300 dark:border-white/10 dark:from-blue-950 dark:via-cyan-800 dark:to-emerald-500 dark:text-white">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-white/80">
                  Get Started
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Start Organizing Smarter Today</h2>
                <p className="mt-2 text-sm text-slate-700 dark:text-white/80">
                  Create a free account and let AI handle the heavy lifting.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/auth/register">
                  <Button size="lg">Create Free Account</Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-background/80 py-10 transition-colors duration-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">AI-Powered Smart Bookmark Manager</h3>
            <p className="text-sm text-muted-foreground">Build a smarter reading workflow.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/auth/login" className="text-muted-foreground transition hover:text-foreground">
              Login
            </Link>
            <Link href="/auth/register" className="text-muted-foreground transition hover:text-foreground">
              Register
            </Link>
            <Link href="/dashboard" className="text-muted-foreground transition hover:text-foreground">
              Dashboard
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AI-Powered Smart Bookmark Manager</p>
        </div>
      </footer>
    </div>
  );
}