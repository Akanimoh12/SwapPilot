import SwapPilotHookABI from "@/config/abis/SwapPilotHook.json";
import ExecutionConfigABI from "@/config/abis/ExecutionConfig.json";

export const SWAPPILOT_HOOK = {
  address: (process.env.NEXT_PUBLIC_SWAPPILOT_HOOK_ADDRESS ??
    "0xCB611482dC1112f768B965d655d83b1DbcF420c8") as `0x${string}`,
  abi: SwapPilotHookABI,
} as const;

export const EXECUTION_CONFIG = {
  address: (process.env.NEXT_PUBLIC_EXECUTION_CONFIG_ADDRESS ??
    "0xe8cf0aCE4A7f5b940c3Cab327117045C03b79Ac3") as `0x${string}`,
  abi: ExecutionConfigABI,
} as const;
