"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function HeaderAuth() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="w-20 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          Dashboard
        </Link>
        <button
          onClick={logout}
          className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="text-sm px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
      >
        Sign up
      </Link>
    </div>
  );
}
