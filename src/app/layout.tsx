import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const SITE_URL = "https://sinai-dashboard-production.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LaunchForge",
    template: "%s · LaunchForge",
  },
  description: "Mission Control for Shipping SaaS",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "LaunchForge",
    description: "Mission Control for Shipping SaaS",
    type: "website",
    url: SITE_URL,
    siteName: "LaunchForge",
  },
  twitter: {
    card: "summary",
    title: "LaunchForge",
    description: "Mission Control for Shipping SaaS",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-mono antialiased bg-background text-foreground`}
      >
        {/* Orbital Command star field — pure CSS, fixed z:-2 */}
        <div className="lf-stars" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
