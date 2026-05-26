import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "마켓크루",
  description: "마켓크루 재시작 기준선",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
