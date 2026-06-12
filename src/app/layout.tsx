import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2f2f7",
};

export const metadata: Metadata = {
  title: "Personal Development Hub",
  description:
    "A personal self-improvement hub for workouts, habits, to-dos, annual goals, journaling, and AI insights.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PD Hub",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ios-bg text-ios-label">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
