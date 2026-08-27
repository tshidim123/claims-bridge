import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { getConfiguredSiteUrl, siteDescription } from "@/lib/metadata";
import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getConfiguredSiteUrl(),
  title: {
    default: "Claims Bridge — Clear tenancy deposit claim support",
    template: "%s — Claims Bridge",
  },
  description: siteDescription,
  applicationName: "Claims Bridge",
  category: "legal technology",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  openGraph: {
    siteName: "Claims Bridge",
    title: "Claims Bridge",
    description: siteDescription,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claims Bridge",
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#050b16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
