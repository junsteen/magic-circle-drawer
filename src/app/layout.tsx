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

export const metadata: Metadata = {
  title: "Arcane Tracer - 魔法陣描画アプリ",
  description: "詠唱の正確さが威力になる。スマホで魔法陣をなぞってスコアを競おう！",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Arcane Tracer",
    statusBarStyle: "black-translucent",
  },
  applicationName: "Arcane Tracer",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00e5ff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arcane Tracer" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-full flex flex-col select-none" style={{ pointerEvents: 'auto', touchAction: 'none', overscrollBehavior: 'none' }}>{children}</body>
    </html>
  );
}
