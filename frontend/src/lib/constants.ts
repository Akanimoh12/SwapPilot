// App-wide constants
export const LARGE_SWAP_THRESHOLD = 10n * 10n ** 18n; // 10 tokens (18-decimal base)
export const MAX_QUEUE_TIME = 5 * 60; // 5 minutes in seconds (matches Constants.sol)
export const AI_EXECUTE_THRESHOLD = 70; // score >= 70 = execute
export const AI_WAIT_THRESHOLD = 40; // score < 40 = expire

export const CALLBACK_PROXY = "0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4" as const;

export const UNICHAIN_CHAIN_ID = 130;
export const UNICHAIN_TESTNET_CHAIN_ID = 1301;
export const REACTIVE_CHAIN_ID = 5318007;

// Deployed contract addresses
export const POOL_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS ??
  "0x7c13D90950F542B297179e09f3A36EaA917A40C1") as `0x${string}`;

export const SWAP_ROUTER_ADDRESS = (process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS ??
  "0xd48ee69b1206c3fdD17E5668A2725E10c2B0f11D") as `0x${string}`;

export const HOOK_ADDRESS = (process.env.NEXT_PUBLIC_SWAPPILOT_HOOK_ADDRESS ??
  "0xCB611482dC1112f768B965d655d83b1DbcF420c8") as `0x${string}`;

// Pool ID for mUSDC/mDAI pool with hook
export const DEFAULT_POOL_ID = (process.env.NEXT_PUBLIC_POOL_ID ??
  "0x95c7854a55b159e9d9cccafea079519fcaca1094e74865f9801237a89904a8ad") as `0x${string}`;

export const AI_ENGINE_URL =
  process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? "http://localhost:8000";

export const LINKS = {
  docs: "https://github.com/AkanniData/swappilot#readme",
  github: "https://github.com/AkanniData/swappilot",
  unichain: "https://unichain.org",
  reactive: "https://reactive.network",
  blockExplorer: process.env.NEXT_PUBLIC_CHAIN === "mainnet"
    ? "https://unichain.blockscout.com"
    : "https://sepolia.uniscan.xyz",
} as const;
