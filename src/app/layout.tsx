import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Social Policy Lab | 사회 정책 실험실",
  description:
    "정책 실험과 불평등 시뮬레이션을 위한 인터랙티브 샌드박스입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-[family-name:var(--font-body)]">{children}</body>
    </html>
  );
}
