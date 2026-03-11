import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import LiveUpdateIndicator from "@/components/LiveUpdateIndicator";
import { LanguageProvider } from "@/components/LanguageProvider";
import { LivePriceProvider } from "@/components/LivePriceProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeoInsight AI — 빅데이터 AI 자산 예측 플랫폼",
  description: "5개 AI 서브모델 토론 + 30인 AI 배심원 심의 + 딥 진단 학습으로 실시간 시장을 분석·예측하는 차세대 AI 앙상블 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LanguageProvider>
          <LivePriceProvider>
            <Navbar />
            <main className="pt-16">{children}</main>
            <LiveUpdateIndicator />
          </LivePriceProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
