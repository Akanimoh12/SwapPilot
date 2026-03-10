import { LINKS } from "@/lib/constants";
import { Zap } from "lucide-react";

const FOOTER_LINKS = [
  { label: "Docs", href: LINKS.docs },
  { label: "GitHub", href: LINKS.github },
  { label: "Unichain", href: LINKS.unichain },
  { label: "Reactive Network", href: LINKS.reactive },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-accent/10">
            <Zap className="h-3 w-3 text-accent" />
          </div>
          <span>SwapPilot &mdash; UHI8 Hookathon</span>
        </div>

        <nav className="flex items-center gap-4">
          {FOOTER_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
