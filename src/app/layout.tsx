import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://presivox.com"),
  title: "Presivox — Verified Presence. Simplified. | presivox.com",
  description: "Secure QR-based Employee Attendance System with GPS Location & Live Selfie Verification — presivox.com",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Presivox — Verified Presence. Simplified.",
    description: "Secure QR-based Employee Attendance System with GPS Location & Live Selfie Verification",
    url: "https://presivox.com",
    siteName: "Presivox",
    images: [
      {
        url: "/favicon.png",
        width: 800,
        height: 800,
        alt: "Presivox Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
