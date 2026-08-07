import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Providers } from "@/app/providers";
import { NIGHT_SHIFT_BOOT_SCRIPT } from "@/lib/appearance";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A84FF",
};

export const metadata: Metadata = {
  title: "Personal Development Hub",
  description:
    "A personal self-improvement hub for workouts, habits, to-dos, annual goals, and journaling.",
  applicationName: "PD Hub",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PD Hub",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-1024.png", sizes: "1024x1024", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} min-h-dvh antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NIGHT_SHIFT_BOOT_SCRIPT }} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PD Hub" />
      </head>
      <body className="min-h-dvh bg-ios-bg text-ios-label">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
