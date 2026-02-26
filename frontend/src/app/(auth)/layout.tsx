import Link from "next/link";

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
    </svg>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-zinc-900">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl dark:from-emerald-500/10 dark:via-emerald-500/5" />
        </div>
        <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4">
          <div className="h-[400px] w-[400px] rounded-full bg-gradient-to-br from-zinc-500/10 to-transparent blur-3xl" />
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="mb-10 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <Logo />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
              ASKA
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              AppleStore Keyword Analyzer
            </p>
          </div>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-900/5 bg-white p-8 shadow-xl shadow-zinc-900/5 dark:border-white/5 dark:bg-zinc-900 dark:shadow-none">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
          By signing in, you agree to our{" "}
          <Link href="#" className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
