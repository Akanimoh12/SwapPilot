"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";
import { NetworkBadge } from "./NetworkBadge";

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
            className="flex items-center gap-2"
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className={cn(
                      "rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white",
                      "transition-colors hover:bg-accent/90",
                    )}
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className={cn(
                      "rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white",
                      "animate-pulse transition-colors hover:bg-danger/90",
                    )}
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <>
                  <NetworkBadge
                    name={chain.name ?? "Unknown"}
                    onClick={openChainModal}
                  />

                  <button
                    onClick={openAccountModal}
                    className={cn(
                      "rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium",
                      "transition-colors hover:bg-card",
                    )}
                  >
                    {account.displayName}
                  </button>
                </>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
