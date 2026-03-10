import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { activeChain } from "@/config/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "SwapPilot",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "04cfe0ddd4b944399a5886a1773d6f94",
  chains: [activeChain],
  transports: {
    [activeChain.id]: http(
      process.env.NEXT_PUBLIC_UNICHAIN_RPC_URL ?? activeChain.rpcUrls.default.http[0]
    ),
  },
  ssr: true,
});
