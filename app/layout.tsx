import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeoInsight — 전문가 신뢰도 기반 투자 예측 플랫폼",
  description: "과거 적중률이 검증된 전문가들의 예측을 신뢰도 가중 방식으로 종합하여 금리·환율·원자재·지수의 방향을 예측합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Navbar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
