import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

const title = "IBAN DevTools — Global Synthetic Identity Studio";
const description =
  "Generate complete synthetic identities, global addresses, insurance, local payment identifiers and checksum-valid IBANs across 250 countries and territories.";

const socialImage =
  "https://raw.githubusercontent.com/tianrking/iban-devtools/main/public/og.png";

export const viewport: Viewport = {
  themeColor: "#0b0e0d",
};

export const metadata: Metadata = {
  title,
  description,
  applicationName: "IBAN DevTools",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IBAN DevTools",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  keywords: [
    "IBAN",
    "synthetic identity",
    "test data",
    "MOD-97",
    "developer tools",
    "validator",
  ],
  openGraph: {
    title,
    description,
    type: "website",
    images: [
      {
        url: socialImage,
        width: 1734,
        height: 907,
        alt: "IBAN DevTools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className={GeistSans.className}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
