import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-protocol-subtle" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            Discover{" "}
            <span className="text-gradient-protocol">
              Low-Competition Niches
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Find untapped opportunities in the App Store with powerful keyword research
            and competitor analysis. Identify high-value keywords with low competition
            to launch your next successful app.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button asChild variant="primary" size="lg">
              <Link href="/register">
                Get Started
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
