// ========================
// app/layout.tsx
// Root layout — wraps all pages
// Providers, fonts, global styles
// ========================

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "./providers";

// Body font — Inter is fine here since it's pairing with
// display font for headings (set in components)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "AI Multi-Agent Workspace",
    template: "%s | AI Workspace",
  },
  description:
    "A collaborative AI system where multiple specialized agents work together to research, plan, engineer, and innovate.",
  keywords: [
    "AI",
    "multi-agent",
    "research",
    "engineering",
    "workspace",
    "LangGraph",
  ],
  authors: [{ name: "Rutuja" }],
  openGraph: {
    title: "AI Multi-Agent Workspace",
    description: "Collaborative AI engineering workspace",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
