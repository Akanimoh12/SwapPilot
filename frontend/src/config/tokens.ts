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
      "0xfd2f67cD354545712f9d8230170015d7e30d133A") as `0x${string}`,
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
      "0xA5dd225Beb2Ec0009Fe143eb0B9309Ba07d23737") as `0x${string}`,
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    logoURI: "/tokens/dai.svg",
  },
];
