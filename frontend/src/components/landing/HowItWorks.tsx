export default function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: "Enter a keyword or competitor app",
      description: "Start by searching for a keyword you're interested in or analyzing a competitor app's keywords.",
    },
    {
      number: 2,
      title: "Analyze competition and search volume",
      description: "View detailed metrics on keyword difficulty, search volume, and which apps currently rank for those terms.",
    },
    {
      number: 3,
      title: "Find your winning niche",
      description: "Discover low-competition opportunities with high search volume to maximize your app's visibility and downloads.",
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Get started in three simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto max-w-4xl">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <div key={step.number} className="flex gap-6">
                {/* Number circle */}
                <div className="flex-shrink-0">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-grow pt-1">
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-base text-zinc-600 dark:text-zinc-400">
                    {step.description}
                  </p>
                </div>

                {/* Connector line (not on last item) */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 mt-12 h-12 w-0.5 bg-zinc-200 dark:bg-zinc-700 translate-x-[23px]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
