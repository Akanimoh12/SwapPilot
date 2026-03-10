import Link from "next/link";
import { Zap, Shield, BarChart3, Clock, Send, Brain, CheckCircle, ArrowRight } from "lucide-react";
import { LiveStats } from "@/components/analytics/LiveStats";

const FEATURES = [
  {
    icon: Zap,
    title: "AI-Powered Timing",
    description:
      "Transformer + Random Forest ensemble analyzes cross-chain signals to find the optimal execution moment.",
  },
  {
    icon: Shield,
    title: "MEV Protection",
    description:
      "Large swaps are queued via Uniswap v4 NoOp pattern, protecting traders from sandwich attacks.",
  },
  {
    icon: BarChart3,
    title: "Cross-Chain Intelligence",
    description:
      "Reactive Network RSCs monitor Ethereum, Unichain, and more for volatility and liquidity signals.",
  },
  {
    icon: Clock,
    title: "Async Execution",
    description:
      "Orders execute asynchronously when market conditions are optimal — no manual babysitting required.",
  },
] as const;

const STEPS = [
  { icon: Send, num: "1", title: "Submit Swap", desc: "Send a large swap through the Uniswap v4 pool with SwapPilot Hook." },
  { icon: Brain, num: "2", title: "AI Monitors", desc: "Cross-chain signals are analyzed in real time by Reactive Network RSCs and the AI Engine." },
  { icon: CheckCircle, num: "3", title: "Optimal Execution", desc: "Your swap executes at the best moment, saving slippage and avoiding MEV." },
] as const;

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="bg-hero-gradient flex w-full flex-col items-center gap-6 px-4 pb-16 pt-24 text-center sm:pt-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent glow-pink-sm">
          <Zap size={14} />
          Uniswap v4 Hook · UHI8 Hookathon
        </div>

        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Smarter Swaps,{" "}
          <span className="text-gradient">Perfect Timing</span>
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-muted">
          SwapPilot is an AI-powered Uniswap v4 Hook that intercepts large
          swaps, queues them, and executes at the optimal moment using
          cross-chain intelligence from Reactive Network.
        </p>

        <div className="mt-6 flex gap-4">
          <Link
            href="/swap"
            className="group inline-flex items-center gap-2 rounded-2xl bg-accent px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-accent-light glow-pink"
          >
            Launch App
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/analytics"
            className="rounded-2xl border border-border bg-card/50 px-7 py-3.5 text-sm font-semibold backdrop-blur-sm transition-all hover:border-accent/30 hover:bg-card"
          >
            View Analytics
          </Link>
        </div>
      </section>

      {/* Live stats */}
      <section className="-mt-6 w-full max-w-3xl px-4">
        <LiveStats />
      </section>

      {/* How it works */}
      <section className="w-full max-w-4xl px-4 py-20">
        <h2 className="mb-2 text-center text-2xl font-bold">How It Works</h2>
        <p className="mx-auto mb-12 max-w-lg text-center text-sm text-muted">
          Three simple steps to smarter, MEV-protected swaps
        </p>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, num, title, desc }) => (
            <div key={num} className="glass-card flex flex-col items-center rounded-2xl p-6 text-center transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Icon size={24} />
              </div>
              <span className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">Step {num}</span>
              <h3 className="mb-2 text-base font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-5xl px-4 pb-20">
        <h2 className="mb-2 text-center text-2xl font-bold">Features</h2>
        <p className="mx-auto mb-12 max-w-lg text-center text-sm text-muted">
          Built on Uniswap v4 Hooks + Reactive Network for cross-chain intelligence
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
                <Icon size={20} />
              </div>
              <h3 className="mb-1.5 text-base font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-hero-gradient w-full py-20 text-center">
        <h2 className="mb-4 text-2xl font-bold">Ready to swap smarter?</h2>
        <p className="mx-auto mb-8 max-w-md text-sm text-muted">
          Experience AI-optimized execution on Unichain with zero MEV exposure
        </p>
        <Link
          href="/swap"
          className="group inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-4 text-base font-semibold text-white transition-all hover:bg-accent-light glow-pink"
        >
          <Zap size={18} />
          Start Swapping
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>
    </div>
  );
}
