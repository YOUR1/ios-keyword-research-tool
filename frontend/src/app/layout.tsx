import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "ASKA - AppleStore Keyword Analyzer",
  description:
    "Professional keyword research and analysis tool for the Apple App Store.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
