import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FengBox — AI 工具集合",
  description: "FengBox 是一个 AI 工具集合网站，让每个人都能用上好用的 AI 工具。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
