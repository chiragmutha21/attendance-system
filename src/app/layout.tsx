import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://presivox.com"),
  title: "Presivox — Verified Presence. Simplified. | presivox.com",
  description: "Secure QR-based Employee Attendance System with GPS Location & Live Selfie Verification — presivox.com",
  icons: {
    icon: "/images/presivox-logo.png",
    shortcut: "/images/presivox-logo.png",
    apple: "/images/presivox-logo.png",
  },
  openGraph: {
    title: "Presivox — Verified Presence. Simplified.",
    description: "Secure QR-based Employee Attendance System with GPS Location & Live Selfie Verification",
    url: "https://presivox.com",
    siteName: "Presivox",
    images: [
      {
        url: "/images/presivox-logo.png",
        width: 800,
        height: 600,
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
      <body>{children}</body>
    </html>
  );
}
