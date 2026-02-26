import { User } from "@/types";

// Uses BFF proxy routes (/api/auth/*) for auth operations
// Uses direct API with cookie-based token for data operations

const BFF_BASE = "/api/auth";

export async function loginApi(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<void> {
  const res = await fetch(`${BFF_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, remember_me: rememberMe }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Login failed");
  }
}

export async function registerApi(
  email: string,
  password: string,
  full_name?: string
): Promise<void> {
  const res = await fetch(`${BFF_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Registration failed");
  }
}

export async function logoutApi(): Promise<void> {
  await fetch(`${BFF_BASE}/logout`, { method: "POST" });
}

export async function getMeApi(): Promise<User | null> {
  const res = await fetch(`${BFF_BASE}/me`);
  if (!res.ok) return null;
  return res.json();
}

export async function refreshApi(): Promise<boolean> {
  const res = await fetch(`${BFF_BASE}/refresh`, { method: "POST" });
  return res.ok;
}

// Authenticated fetch helper for dashboard API calls
export async function authFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  // In BFF pattern, the cookie is sent automatically
  // We proxy through Next.js API routes for auth
  const res = await fetch(
    `/api/auth/proxy?path=${encodeURIComponent(path)}`,
    {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    }
  );
  if (res.status === 401) {
    // Try refresh
    const refreshed = await refreshApi();
    if (refreshed) {
      const retry = await fetch(
        `/api/auth/proxy?path=${encodeURIComponent(path)}`,
        {
          ...options,
          headers: { "Content-Type": "application/json", ...options?.headers },
        }
      );
      if (!retry.ok) throw new Error(`API error: ${retry.status}`);
      return retry.json();
    }
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `API error: ${res.status}`);
  }
  return res.json();
}
