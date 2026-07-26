import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "IBAN DevTools — 完整跨国测试身份生成器";
const description =
  "选择国家、城市、性别与年龄，一次生成完整本地化测试身份、地址、保险、银行账户、沙盒银行卡与合法校验码 IBAN。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title,
    description,
    applicationName: "IBAN DevTools",
    manifest: "/manifest.webmanifest",
    themeColor: "#0b0e0d",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "IBAN DevTools",
    },
    icons: {
      icon: "/icon.svg",
      apple: "/icon.svg",
    },
    keywords: ["IBAN", "synthetic identity", "test data", "MOD-97", "developer tools", "validator"],
    openGraph: {
      title,
      description,
      type: "website",
      url: origin,
      images: [{ url: `${origin}/og.png`, width: 1734, height: 907, alt: "IBAN DevTools" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
