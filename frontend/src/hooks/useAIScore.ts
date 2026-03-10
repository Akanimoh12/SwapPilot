"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AI_ENGINE_URL } from "@/lib/constants";
import { useOnChainScore } from "./useExecutionConfig";
import type { AIScore } from "@/lib/types";

const POLL_INTERVAL = 10_000; // 10 seconds

interface UseAIScoreReturn {
  score: number;
  action: "execute" | "wait" | "expire";
  confidence: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export function useAIScore(poolId: `0x${string}`): UseAIScoreReturn {
  const [state, setState] = useState<{
    score: number;
    action: "execute" | "wait" | "expire";
    confidence: number;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;
  }>({
    score: 0,
    action: "wait",
    confidence: 0,
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  // Fallback to on-chain score
  const { score: onChainScore } = useOnChainScore(poolId);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool_id: poolId,
          features: [], // The API route handles feature generation
          chain: "unichain",
        }),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();
      const score = Number(data.execution_score ?? 0);
      const action: "execute" | "wait" | "expire" =
        score >= 70 ? "execute" : score >= 40 ? "wait" : "expire";

      setState({
        score,
        action,
        confidence: Number(data.confidence ?? 0),
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      // Fallback to on-chain score
      const score = onChainScore;
      const action: "execute" | "wait" | "expire" =
        score >= 70 ? "execute" : score >= 40 ? "wait" : "expire";

      setState((prev) => ({
        ...prev,
        score,
        action,
        isLoading: false,
        error: err instanceof Error ? err.message : "AI engine unavailable",
        lastUpdated: Date.now(),
      }));
    }
  }, [poolId, onChainScore]);

  useEffect(() => {
    fetchScore();
    const interval = setInterval(fetchScore, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchScore]);

  return state;
}
