import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8282";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rememberMe = body.remember_me || false;

    const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { detail: data.detail || "Login failed" },
        { status: res.status }
      );
    }

    const tokens = await res.json();
    const response = NextResponse.json({ success: true });

    // Set access_token as httpOnly cookie
    response.cookies.set("access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in || 3600,
    });

    // Set refresh_token as httpOnly cookie
    // Use 90 days for "remember me", 30 days otherwise
    const refreshMaxAge = rememberMe
      ? 60 * 60 * 24 * 90  // 90 days
      : 60 * 60 * 24 * 30; // 30 days

    response.cookies.set("refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: refreshMaxAge,
    });

    return response;
  } catch {
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
