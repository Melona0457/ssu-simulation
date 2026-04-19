import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ssu-simulation.vercel.app"),
  title: "오 나의 교수님! 비밀 에피소드",
  description: "교수님을 커스터마이징하고 시험 전날의 선택지를 따라가는 로맨스 시뮬레이션",
  openGraph: {
    title: "오 나의 교수님! 비밀 에피소드",
    description: "교수님을 커스터마이징하고 시험 전날의 선택지를 따라가는 로맨스 시뮬레이션",
    url: "https://ssu-simulation.vercel.app",
    siteName: "오 나의 교수님! 비밀 에피소드",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "오 나의 교수님! 비밀 에피소드",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "오 나의 교수님! 비밀 에피소드",
    description: "교수님을 커스터마이징하고 시험 전날의 선택지를 따라가는 로맨스 시뮬레이션",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const bgmOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_BGM_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_BGM_BASE_URL).origin
      : null;
  } catch {
    return null;
  }
})();

const voiceOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_VOICE_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_VOICE_BASE_URL).origin
      : null;
  } catch {
    return null;
  }
})();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {bgmOrigin && (
          <>
            <link rel="dns-prefetch" href={bgmOrigin} />
            <link rel="preconnect" href={bgmOrigin} crossOrigin="anonymous" />
          </>
        )}
        {voiceOrigin && voiceOrigin !== bgmOrigin && (
          <>
            <link rel="dns-prefetch" href={voiceOrigin} />
            <link rel="preconnect" href={voiceOrigin} crossOrigin="anonymous" />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
