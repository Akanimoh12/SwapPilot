// Core domain types for SwapPilot frontend

export type OrderStatus = "queued" | "monitoring" | "executed" | "expired";

export interface QueuedOrder {
  orderId: bigint;
  trader: `0x${string}`;
  poolId: `0x${string}`;
  zeroForOne: boolean;
  amountSpecified: bigint;
  queuedAt: number; // unix timestamp
  maxSlippage: number; // bps
  executed: boolean;
  expired: boolean;
}

export interface PoolConfig {
  largeSwapThreshold: bigint;
  maxQueueTime: number;
  maxSlippage: number;
  active: boolean;
}

export interface AIScore {
  executionScore: number; // 0-100
  confidence: number; // 0-1
  action: "execute" | "wait" | "expire";
  transformerScore: number;
  rfScore: number;
  timestamp: number;
}

export interface ExecutionResult {
  orderId: bigint;
  trader: `0x${string}`;
  aiScore: number;
  actualSlippage: number; // bps
  waitTimeSeconds: number;
  txHash: `0x${string}`;
  blockNumber: number;
}

export interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface SwapFormData {
  tokenIn: TokenInfo | null;
  tokenOut: TokenInfo | null;
  amountIn: string;
  slippageTolerance: number; // bps
}

export interface PredictionRequest {
  pool_id: string;
  features: number[][];
  chain: string;
}

export interface PredictionResponse {
  execution_score: number;
  confidence: number;
  action: string;
  transformer_score: number;
  rf_score: number;
}

export interface ChainVolatility {
  chainId: number;
  name: string;
  volatility: number;
  lastUpdate: number;
}
