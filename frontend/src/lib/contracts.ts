import SwapPilotHookABI from "@/config/abis/SwapPilotHook.json";
import ExecutionConfigABI from "@/config/abis/ExecutionConfig.json";

export const SWAPPILOT_HOOK = {
  address: (process.env.NEXT_PUBLIC_SWAPPILOT_HOOK_ADDRESS ??
    "0x4b38424B0F9EB7bA027b9a413B15B6Cc09d020c8") as `0x${string}`,
  abi: SwapPilotHookABI,
} as const;

export const EXECUTION_CONFIG = {
  address: (process.env.NEXT_PUBLIC_EXECUTION_CONFIG_ADDRESS ??
    "0xcCDB2468De9C89fA6e283B96A0A6714201610F8E") as `0x${string}`,
  abi: ExecutionConfigABI,
} as const;
