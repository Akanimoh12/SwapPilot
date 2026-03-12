import type { TokenInfo } from "@/lib/types";

// Only tokens with initialized pools on Unichain Sepolia.
// Current pool: mUSDC / mDAI (fee=3000, tickSpacing=60, hooks=SwapPilotHook)
export const TOKENS: TokenInfo[] = [
  {
    address: (process.env.NEXT_PUBLIC_TOKEN_USDC ??
      "0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C") as `0x${string}`,
    symbol: "mUSDC",
    name: "Mock USDC",
    decimals: 6,
    logoURI: "/tokens/usdc.svg",
  },
  {
    address: (process.env.NEXT_PUBLIC_TOKEN_DAI ??
      "0x7d1dea64e891dccb20f85bC379227238c8C1308b") as `0x${string}`,
    symbol: "mDAI",
    name: "Mock DAI",
    decimals: 18,
    logoURI: "/tokens/dai.svg",
  },
];
