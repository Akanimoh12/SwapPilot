import SwapPilotHookABI from "@/config/abis/SwapPilotHook.json";
import ExecutionConfigABI from "@/config/abis/ExecutionConfig.json";

export const SWAPPILOT_HOOK = {
  address: (process.env.NEXT_PUBLIC_SWAPPILOT_HOOK_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  abi: SwapPilotHookABI,
} as const;

export const EXECUTION_CONFIG = {
  address: (process.env.NEXT_PUBLIC_EXECUTION_CONFIG_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  abi: ExecutionConfigABI,
} as const;
