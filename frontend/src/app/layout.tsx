import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { Web3Provider } from "@/providers/Web3Provider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SwapPilot — AI-Powered Swap Execution",
  description:
    "AI-powered asynchronous swap execution hook for Uniswap v4 with cross-chain timing intelligence via Reactive Network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <Web3Provider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster richColors position="bottom-right" />
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
