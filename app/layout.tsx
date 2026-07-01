/**
 * 루트 레이아웃.
 * ProgressBar를 body 최상단에 주입해 모든 <Link> 기반 페이지 전환에 자동 적용.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ProgressBar } from "@/components/app/layout/progress-bar";
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
  title: "Speech-M",
  description: "Speech-M 아나운서 아카데미 ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <ProgressBar />
        {children}
      </body>
    </html>
  );
}
