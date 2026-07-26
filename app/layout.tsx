import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "IBAN DevTools — IBAN 与德国测试身份生成器";
const description =
  "纯前端 IBAN 与德国测试身份生成器，支持 Steuer-ID、批量导出、MOD-97 校验与结构解析。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "iban-devtools-lab.tian-r-king.chatgpt.site";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title,
    description,
    applicationName: "IBAN DevTools",
    keywords: ["IBAN", "Steuer-ID", "German test data", "MOD-97", "developer tools", "validator"],
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
      </body>
    </html>
  );
}
