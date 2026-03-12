import type { TokenInfo } from "@/lib/types";

// Token addresses are configured per-network.
// On testnet, deploy MockERC20 tokens and set these env vars.
// On mainnet, use canonical Unichain token addresses.
export const TOKENS: TokenInfo[] = [
  {
    address: "0x0000000000000000000000000000000000000000",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    logoURI: "/tokens/eth.svg",
  },
  {
    address: (process.env.NEXT_PUBLIC_TOKEN_USDC ??
      "0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C") as `0x${string}`,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoURI: "/tokens/usdc.svg",
  },
  {
    address: (process.env.NEXT_PUBLIC_TOKEN_WETH ??
      "0x4200000000000000000000000000000000000006") as `0x${string}`,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    logoURI: "/tokens/weth.svg",
  },
  {
    address: (process.env.NEXT_PUBLIC_TOKEN_DAI ??
      "0x7d1dea64e891dccb20f85bC379227238c8C1308b") as `0x${string}`,
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    logoURI: "/tokens/dai.svg",
  },
];
