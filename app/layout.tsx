import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 마케팅 운영실",
  description: "커피프린트와 스티커씨를 위한 AI 마케팅 운영실",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
