import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8282";

async function handleProxy(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { detail: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { detail: "Missing path parameter" },
        { status: 400 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/v1${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    // Forward body for methods that support it
    let body: string | undefined;
    if (request.method === "POST" || request.method === "PATCH") {
      const contentType = request.headers.get("content-type");
      if (contentType) {
        headers["Content-Type"] = contentType;
      }
      body = await request.text();
    }

    const res = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { detail: data.detail || `API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function POST(request: NextRequest) {
  return handleProxy(request);
}

export async function PATCH(request: NextRequest) {
  return handleProxy(request);
}

export async function DELETE(request: NextRequest) {
  return handleProxy(request);
}
