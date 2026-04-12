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

export const metadata: Metadata = {
  title: "LaunchForge",
  description: "Mission Control for Shipping SaaS",
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
