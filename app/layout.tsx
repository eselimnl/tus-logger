import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "TUS Takip",
  description: "TUS 2027 konu, tekrar ve soru takibi",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "TUS Takip", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-20">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
