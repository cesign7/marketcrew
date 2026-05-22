import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "마켓크루 업무실",
  description: "캐릭터 기반 AI 마케팅 운영 업무실",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
