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
      "0x45944B08fea203a7469C82A690F68fabF85B8283") as `0x${string}`,
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
      "0xc993F01C962fd61a588BB00EfB5cc373764c4ADd") as `0x${string}`,
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    logoURI: "/tokens/dai.svg",
  },
];
