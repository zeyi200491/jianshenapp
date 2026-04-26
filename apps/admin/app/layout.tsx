import type { ReactNode } from "react";
import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CampusFit AI 运营后台",
  description: "CampusFit AI 后台 MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
