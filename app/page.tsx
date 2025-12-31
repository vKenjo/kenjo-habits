import HabitTracker from '@/components/HabitTracker';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-moon to-porcelain">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-midnight tracking-tight mb-2">
            Habit Tracker
          </h1>
          <p className="text-base text-china">
            Track your daily habits and build consistency
          </p>
        </header>
        <main>
          <HabitTracker />
        </main>
      </div>
    </div>
  );
}
