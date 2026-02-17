import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "Worst Rated iOS Apps Index",
  description:
    "Discover the lowest-rated apps in the Apple App Store, ranked by Bayesian weighted average.",
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
