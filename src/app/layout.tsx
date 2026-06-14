import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nanum_Myeongjo } from "next/font/google";
import "./globals.css";

/** 모바일 뷰포트 — 풀스크린 캔버스 앱. 노치까지 덮고(cover), 더블탭 줌 방지(궤도 드래그와 충돌). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050810",
  colorScheme: "dark",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 작품 도록(/guide) 전용 명조 — 모던·신비로운 잡지 헤드라인용. 변수만 노출(메인 화면엔 영향 없음).
const serifKr = Nanum_Myeongjo({
  variable: "--font-serif-kr",
  weight: ["400", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEURO·EARTH — 살아있는 인공뇌",
  description:
    "지구 위에 그린 신경망이 실제 지구 데이터(지진·스타링크)로 자극받아 신경가소성으로 스스로 재배선되는 인공뇌. by 민서",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${serifKr.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
