import "./globals.css";

import type { Metadata, Viewport } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import RootProvider from "@/components/providers/RootProvider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sora",
    template: "%s | Sora",
  },
  description:
    "A free shared finance app for couples and households: one ledger, budgets, and goals.",
  keywords: [
    "shared finances",
    "couple budget",
    "household budget",
    "expense tracker",
    "saving goals",
  ],
  creator: "Aditya Rahmad",
  authors: [{ name: "Aditya Rahmad", url: "https://instagram.com/adxxya30" }],

  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Sora",
    description: "Take control of your finances with Sora.",
    siteName: "Sora",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sora Overview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sora - Your Personal Finance Companion",
    description: "Track expenses, manage income, and reach your saving goals.",
    images: ["/og-image.png"],
    creator: "@adxxya30",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon1.png",
    apple: "/apple-icon.png",
  },

  manifest: "/manifest.json",
  appleWebApp: {
    title: "Sora",
    statusBarStyle: "default",
    capable: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">
        <Toaster richColors position="bottom-right" />
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
