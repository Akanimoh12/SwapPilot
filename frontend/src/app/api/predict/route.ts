import { NextRequest, NextResponse } from "next/server";
import { AI_ENGINE_URL } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${AI_ENGINE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "AI engine returned an error", status: res.status },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "AI engine unavailable", details: String(err) },
      { status: 503 },
    );
  }
}
