import { NextResponse } from "next/server";
import { AI_ENGINE_URL } from "@/lib/constants";

export async function GET() {
  let aiHealthy = false;

  try {
    const res = await fetch(`${AI_ENGINE_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const data = await res.json();
      aiHealthy = data.status === "healthy";
    }
  } catch {
    aiHealthy = false;
  }

  return NextResponse.json({
    status: aiHealthy ? "healthy" : "degraded",
    ai_engine: aiHealthy,
    timestamp: new Date().toISOString(),
  });
}
