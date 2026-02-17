"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import HeaderAuth from "@/components/HeaderAuth";

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
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center">
                <Star className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Worst Rated iOS Apps
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  App Store Bottom Rankings
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <HeaderAuth />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Data sourced from the public iTunes Search API. Ratings use Bayesian
            weighted averages. Not affiliated with Apple.
          </p>
        </div>
      </footer>
    </>
  );
}
