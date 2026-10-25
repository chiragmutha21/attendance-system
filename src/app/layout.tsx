import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "Smart Attendance Portal",
  description: "Secure QR-based Employee Attendance System with GPS Location & Live Selfie Verification.",
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
