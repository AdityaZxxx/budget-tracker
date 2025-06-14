import RootProvider from "@/components/providers/RootProvider";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "Budget Tracker",
    template: "%s | Budget Tracker",
  },
  description:
    "A personal budget manager for tracking your financial activities and achieving your financial goals.",
  keywords: [
    "budget tracker",
    "expense tracker",
    "personal finance",
    "money manager",
    "saving goals",
  ],
  creator: "Aditya Rahmad",
  authors: [{ name: "Aditya Rahmad", url: "https://instagram.com/adxxya30" }],

  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Budget Tracker",
    description: "Take control of your finances with Budget Tracker.",
    siteName: "Budget Tracker",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Budget Tracker Overview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Budget Tracker - Your Personal Finance Companion",
    description: "Track expenses, manage income, and reach your saving goals.",
    images: ["/og-image.png"],
    creator: "@adxxya30",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon1.png",
    apple: "/apple-icon.png",
  },

  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "Budget Tracker",
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
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Toaster richColors position="bottom-right" />
          <RootProvider>{children}</RootProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
