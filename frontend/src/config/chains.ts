import { defineChain } from "viem";

export const unichainSepolia = defineChain({
  id: 1301,
  name: "Unichain Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_UNICHAIN_RPC_URL ?? "https://sepolia.unichain.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Uniscan",
      url: "https://sepolia.uniscan.xyz",
    },
  },
  testnet: true,
});

export const unichain = defineChain({
  id: 130,
  name: "Unichain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.unichain.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Uniscan",
      url: "https://unichain.blockscout.com",
    },
  },
});

// Use testnet by default for development; switch to mainnet for production
export const activeChain = process.env.NEXT_PUBLIC_CHAIN === "mainnet" ? unichain : unichainSepolia;
