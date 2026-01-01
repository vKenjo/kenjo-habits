import HabitTracker from '@/components/HabitTracker';
import DailyQuote from '@/components/DailyQuote';
import DailyReading from '@/components/DailyReading';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-moon via-porcelain to-dawn/30 text-midnight selection:bg-royal/20">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-sky/20 to-dawn/20 rounded-full blur-[100px] opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-china/10 to-royal/5 rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-porcelain/40 to-white/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Unified Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/50 backdrop-blur-md rounded-full border border-white/50 shadow-sm mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-royal/75 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-royal"></span>
              </span>
              <span className="text-xs font-semibold text-china tracking-wide uppercase">Daily Progress</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-midnight tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-midnight to-royal">Habit</span> Tracker
            </h1>
            <p className="text-lg text-china mt-2 font-medium">Build consistency. Achieve goals.</p>
          </div>

          <div className="hidden md:flex flex-col items-end">
            <p className="text-sm font-medium text-china/60 uppercase tracking-wider">Today</p>
            <p className="text-2xl font-bold text-midnight">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </header>

        {/* Main Grid Layout */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Focus Column (Left Sidebar on Desktop) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            {/* Quote Section */}
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-1 shadow-sm border border-white/50">
              <DailyQuote />
            </div>

            {/* Reading Section */}
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-1 shadow-sm border border-white/50">
              <DailyReading />
            </div>
          </div>

          {/* Tracker Column (Main Content) */}
          <div className="lg:col-span-8">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl shadow-royal/5 border border-white/50 overflow-hidden">
              <HabitTracker />
            </div>
          </div>

        </main>

        {/* Footer */}
        <footer className="mt-12 text-center border-t border-china/5 pt-8">
          <p className="text-sm font-medium text-china/40 hover:text-china/60 transition-colors">
            Made with <span className="text-red-400 animate-pulse">❤️</span> for better habits
          </p>
        </footer>
      </div>
    </div>
  );
}
