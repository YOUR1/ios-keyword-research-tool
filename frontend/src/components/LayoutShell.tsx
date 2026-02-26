"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import HeaderAuth from "@/components/HeaderAuth";

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
    </svg>
  );
}

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl dark:from-emerald-500/10 dark:via-emerald-500/5" />
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900/5 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-white/5 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <Logo />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  ASKA
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  AppleStore Keyword Analyzer
                </p>
              </div>
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <nav className="hidden items-center gap-1 sm:flex">
                <Link
                  href="/"
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === "/"
                      ? "bg-zinc-900/5 text-zinc-900 dark:bg-white/10 dark:text-white"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  Index
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Dashboard
                </Link>
              </nav>

              <div className="h-5 w-px bg-zinc-900/10 dark:bg-white/10" />

              <div className="flex items-center gap-2">
                <HeaderAuth />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900/5 dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <Logo />
              </div>
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                ASKA
              </span>
            </div>
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              Data sourced from public iTunes Search API. Rankings use Bayesian weighted averages.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Not affiliated with Apple Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
