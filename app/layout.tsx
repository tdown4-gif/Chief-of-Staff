import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trusted External Memory",
  description: "One inbox for messy context Ty wants to remember.",
  manifest: "/manifest.webmanifest",
  applicationName: "Memory",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Memory"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
