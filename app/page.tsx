import HabitTracker from '@/components/HabitTracker';
import DailyQuote from '@/components/DailyQuote';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-moon via-porcelain to-dawn/30">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-sky/30 to-dawn/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-china/20 to-royal/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12 lg:py-16">
        {/* Top Section: Quote on left, Header on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
          {/* Daily Quote */}
          <div className="lg:col-span-1">
            <DailyQuote />
          </div>

          {/* Header */}
          <div className="lg:col-span-2 flex flex-col justify-center text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/60 backdrop-blur-sm rounded-full mb-4 border border-china/10 w-fit mx-auto lg:mx-0">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-royal to-china animate-pulse" />
              <span className="text-xs font-medium text-china">Track your daily progress</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-midnight tracking-tight mb-2 sm:mb-3">
              Habit Tracker
            </h1>
            <p className="text-base sm:text-lg text-china max-w-md mx-auto lg:mx-0">
              Build consistency. Achieve goals. One day at a time.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <main>
          <HabitTracker />
        </main>

        {/* Footer */}
        <footer className="mt-8 sm:mt-12 text-center">
          <p className="text-xs text-china/60">
            Made with ❤️ for building better habits
          </p>
        </footer>
      </div>
    </div>
  );
}
