import "./globals.css";
import type { Metadata } from "next";
import { Viewport } from "next/dist/lib/metadata/types/extra-types";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hisaab – Fair Expense Sharing",
  description:
    "Split expenses exactly the way you want with manual item-based splitting.",
  openGraph: {
    images: [{ url: "/logo-192x192.png" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: "/logo-192x192.png" }],
  },
};

export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* iOS PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Hisaab" />
        <meta name="theme-color" content="#1d4ed8" />

        {/* iOS home screen icon */}
        <link rel="apple-touch-icon" href="/logo-192x192.png" />

        {/* iOS Splash Screens (generate these for each device size) */}
        <link
          rel="apple-touch-startup-image"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/iphone14.png"
        />
        {/* Add more sizes as needed */}
      </head>
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
