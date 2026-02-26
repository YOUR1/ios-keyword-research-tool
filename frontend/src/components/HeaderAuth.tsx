"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function HeaderAuth() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="w-20 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            Dashboard
          </Link>
        </Button>
        <Button
          onClick={logout}
          variant="ghost"
          size="sm"
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href="/login">
          Sign in
        </Link>
      </Button>
      <Button asChild variant="primary" size="sm">
        <Link href="/register">
          Sign up
        </Link>
      </Button>
    </div>
  );
}
