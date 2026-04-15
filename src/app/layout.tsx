import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";
import "./globals.css";

const midmi = localFont({
  src: "./온글잎 밑미.ttf",
  variable: "--font-midmi",
});

export const metadata: Metadata = {
  title: "두근두근 교수님과 시험기간 시뮬레이션",
  description: "교수님 커스터마이징과 시험 전날 분기형 선택지를 중심으로 한 MVP 시뮬레이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${midmi.variable} h-full antialiased`}>
      <body className={`${midmi.className} min-h-full flex flex-col`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
