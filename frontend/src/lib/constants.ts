// App-wide constants
export const LARGE_SWAP_THRESHOLD = 10n * 10n ** 18n; // 10 ETH
export const MAX_QUEUE_TIME = 5 * 60; // 5 minutes in seconds (matches Constants.sol)
export const AI_EXECUTE_THRESHOLD = 70; // score >= 70 = execute
export const AI_WAIT_THRESHOLD = 40; // score < 40 = expire

export const CALLBACK_PROXY = "0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4" as const;

export const UNICHAIN_CHAIN_ID = 130;
export const UNICHAIN_TESTNET_CHAIN_ID = 1301;
export const REACTIVE_CHAIN_ID = 5318007;

export const AI_ENGINE_URL =
  process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? "http://localhost:8000";

export const LINKS = {
  docs: "https://github.com/your-username/swappilot#readme",
  github: "https://github.com/your-username/swappilot",
  unichain: "https://unichain.org",
  reactive: "https://reactive.network",
  blockExplorer: process.env.NEXT_PUBLIC_CHAIN === "mainnet"
    ? "https://unichain.blockscout.com"
    : "https://sepolia.uniscan.xyz",
} as const;
