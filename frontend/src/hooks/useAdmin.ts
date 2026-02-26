"use client";

import { useAuth } from "@/contexts/AuthContext";

export function useAdmin() {
  const { user, loading } = useAuth();

  const isAdmin = user?.role === "admin";

  return {
    isAdmin,
    loading,
    user,
  };
}
