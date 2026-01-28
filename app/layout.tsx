import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MobileKeyboardEnterHint } from "@/components/MobileKeyboardEnterHint";
import { GoogleAnalytics } from '@next/third-parties/google';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ザイロク",
  description: "現場管理システム",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
        <MobileKeyboardEnterHint />
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
