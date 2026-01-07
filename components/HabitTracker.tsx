'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase, isSupabaseConfigured, Habit, HabitCompletion } from '@/lib/supabase';

interface HabitStats {
    completionRate: number;
    currentStreak: number;
    bestStreak: number;
    totalCompleted: number;
    totalDays: number;
}

export default function HabitTracker() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [completions, setCompletions] = useState<HabitCompletion[]>([]);
    const [maximRatings, setMaximRatings] = useState<{ rating: boolean; updated_at: string }[]>([]);
    const [currentDate, setCurrentDate] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });
    const [newHabitName, setNewHabitName] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
    const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
    const [showStats, setShowStats] = useState(false);

    // Initialize date on client side to avoid hydration mismatch
    useEffect(() => {
        setCurrentDate(new Date());
    }, []);

    // Get days in month
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    // Get day of week for a specific date
    const getDayOfWeek = (date: Date, day: number) => {
        const d = new Date(date.getFullYear(), date.getMonth(), day);
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return days[d.getDay()];
    };

    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    // Format date for database (Local YYYY-MM-DD)
    const formatDate = (date: Date, day: number) => {
        const d = new Date(date.getFullYear(), date.getMonth(), day);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Check if a date is today
    const isToday = (day: number) => {
        if (!currentDate) return false;
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === currentDate.getMonth() &&
            today.getFullYear() === currentDate.getFullYear()
        );
    };

    // Parse a date string (YYYY-MM-DD or ISO timestamp) to local midnight Date
    // This handles timezone correctly by extracting the date portion
    const parseLocalDate = (dateStr: string): Date => {
        // If it's a simple YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        // If it's an ISO timestamp, create Date and extract local date
        const d = new Date(dateStr);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    // Check if a day is before the habit's creation date
    const isBeforeCreation = (habit: Habit, day: number): boolean => {
        if (!currentDate) return false;
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const createdDate = parseLocalDate(habit.created_at);
        return dayDate < createdDate;
    };

    // Fetch habits
    const fetchHabits = useCallback(async () => {
        if (!isSupabaseConfigured) return;
        const { data, error } = await supabase
            .from('habits')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('Error fetching habits:', error);
            return;
        }
        setHabits(data || []);
    }, []);

    // Fetch completions for current month
    const fetchCompletions = useCallback(async () => {
        if (!isSupabaseConfigured || !currentDate) return;

        // Get start and end of view range (with buffer)
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('habit_completions')
            .select('*')
            .gte('completed_date', startStr)
            .lte('completed_date', endStr);

        if (error) {
            console.error('Error fetching completions:', error);
            return;
        }
        setCompletions(data || []);
    }, [currentDate]);

    // Fetch maxim ratings for current month
    const fetchMaximRatings = useCallback(async () => {
        if (!isSupabaseConfigured || !currentDate) return;

        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const startStr = start.toISOString();
        const endStr = end.toISOString();

        // We only care about positive ratings for the stats
        const { data, error } = await supabase
            .from('maxim_ratings')
            .select('rating, updated_at')
            .gte('updated_at', startStr)
            .lte('updated_at', endStr)
            .eq('rating', true)
            .is('user_id', null);

        if (error) {
            console.error('Error fetching maxim ratings:', error);
            return;
        }
        setMaximRatings(data || []);
    }, [currentDate]);

    // Load data
    useEffect(() => {
        if (!isSupabaseConfigured || !currentDate) return;
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchHabits(), fetchCompletions(), fetchMaximRatings()]);
            setIsLoading(false);
        };
        loadData();
    }, [fetchHabits, fetchCompletions, fetchMaximRatings, currentDate]);

    // Calculate stats for a habit
    const calculateStats = useCallback((habitId: string): HabitStats => {
        const habit = habits.find(h => h.id === habitId);
        if (!currentDate || !habit) return { completionRate: 0, currentStreak: 0, bestStreak: 0, totalCompleted: 0, totalDays: 0 };

        const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        // Filter completions for this month
        const habitCompletions = completions.filter(c =>
            c.habit_id === habitId &&
            c.completed_date.startsWith(currentMonthStr)
        );
        const uniqueDates = new Set(habitCompletions.map(c => c.completed_date));

        const today = new Date();
        const daysInMonth = getDaysInMonth(currentDate);
        const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

        // Determine effective start date (max of first day of month OR [creation date / earliest completion])
        const firstDayOfMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        // Find earliest completion for this habit in the current view context
        let earliestRelevantCompletion: Date | null = null;
        if (habitCompletions.length > 0) {
            const dates = habitCompletions.map(c => c.completed_date).sort();
            if (dates.length > 0) {
                // Use parseLocalDate to correctly handle YYYY-MM-DD format
                earliestRelevantCompletion = parseLocalDate(dates[0]);
            }
        }

        // Use parseLocalDate to correctly handle timezone for created_at
        const createdAtDate = parseLocalDate(habit.created_at);

        // Effective start is the EARLIER of creation or first completion
        let effectiveStart = createdAtDate;
        if (earliestRelevantCompletion && earliestRelevantCompletion < createdAtDate) {
            effectiveStart = earliestRelevantCompletion;
        }

        let startCountingDate = firstDayOfMonthDate;
        if (effectiveStart > firstDayOfMonthDate) {
            startCountingDate = effectiveStart;
        }

        // Determine effective end date (today if current month, else end of month)
        const endCountingDate = isCurrentMonth ? today : new Date(currentDate.getFullYear(), currentDate.getMonth(), daysInMonth);
        endCountingDate.setHours(0, 0, 0, 0);

        // Calculate total trackable days
        let totalDays = 0;
        if (startCountingDate <= endCountingDate) {
            const diffTime = Math.abs(endCountingDate.getTime() - startCountingDate.getTime());
            totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        // Calculate total completed within the valid window
        let totalCompleted = 0;
        const startCountingStr = `${startCountingDate.getFullYear()}-${String(startCountingDate.getMonth() + 1).padStart(2, '0')}-${String(startCountingDate.getDate()).padStart(2, '0')}`;
        const endCountingStr = `${endCountingDate.getFullYear()}-${String(endCountingDate.getMonth() + 1).padStart(2, '0')}-${String(endCountingDate.getDate()).padStart(2, '0')}`;

        uniqueDates.forEach(date => {
            if (date >= startCountingStr && date <= endCountingStr) {
                totalCompleted++;
            }
        });

        const completionRate = totalDays > 0 ? Math.round((totalCompleted / totalDays) * 100) : 0;

        // Calculate streaks (simplified logic: check streaks within the month view)
        // Note: Best streak might theoretically span across months, but we are approximate here for the month view
        let bestStreak = 0;
        let tempStreak = 0;

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = formatDate(currentDate, i);

            // Respect the creation date for streaks too - don't count missing days before creation
            // Although 'streak' implies contiguous completion, we treat pre-creation days as non-existent.
            // But standard streak logic usually just looks for contiguous checks. 
            // If we want to be strict: a streak can't exist before creation.
            if (dateStr < startCountingStr) continue;

            // Don't count streaks into the future
            if (dateStr > endCountingStr) break;

            if (uniqueDates.has(dateStr)) {
                tempStreak++;
                if (tempStreak > bestStreak) bestStreak = tempStreak;
            } else {
                tempStreak = 0;
            }
        }

        // Recalculate current streak working backwards from today/end of month
        let currentStreak = 0;
        // Start checking from the last valid day (today or end of month)
        const lastCheckDay = isCurrentMonth ? today.getDate() : daysInMonth;

        for (let i = lastCheckDay; i >= 1; i--) {
            const dateStr = formatDate(currentDate, i);

            // If we go before creation date, stop
            if (dateStr < startCountingStr) break;

            if (uniqueDates.has(dateStr)) {
                currentStreak++;
            } else {
                break;
            }
        }

        return { completionRate, currentStreak, bestStreak, totalCompleted, totalDays };
    }, [completions, currentDate, habits]);

    // Overall stats
    const overallStats = useMemo(() => {
        if (!currentDate || habits.length === 0) return null;

        const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        // Check if we are in Jan 2026 (or earlier, which shouldn't happen)
        const isStartOfTime = currentDate.getFullYear() === 2026 && currentDate.getMonth() === 0;

        const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        // Helper to calculate stats for a specific month context
        const calculateMonthStats = (date: Date, monthStr: string) => {
            const today = new Date();
            const daysInMonth = getDaysInMonth(date);
            const isCurrentMonth = today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear();

            // End date for the month context (either today or end of month)
            const endDate = isCurrentMonth ? today : new Date(date.getFullYear(), date.getMonth(), daysInMonth);
            endDate.setHours(0, 0, 0, 0);
            const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

            const monthCompletions = completions.filter(c => c.completed_date.startsWith(monthStr));

            let totalPossible = 0;
            let totalCompleted = 0;

            habits.forEach(habit => {
                const firstDayOfMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
                // Use parseLocalDate to correctly handle timezone for created_at
                const createdAtDate = parseLocalDate(habit.created_at);

                // Check for retroactive completions in this month
                const habitCompletionsInMonth = monthCompletions.filter(c => c.habit_id === habit.id);
                let earliestCompletion: Date | null = null;
                if (habitCompletionsInMonth.length > 0) {
                    const sorted = habitCompletionsInMonth.map(c => c.completed_date).sort();
                    // Use parseLocalDate to correctly handle YYYY-MM-DD format
                    earliestCompletion = parseLocalDate(sorted[0]);
                }

                let effectiveStart = createdAtDate;
                if (earliestCompletion && earliestCompletion < createdAtDate) {
                    effectiveStart = earliestCompletion;
                }

                let startCountingDate = firstDayOfMonthDate;
                if (effectiveStart > firstDayOfMonthDate) {
                    startCountingDate = effectiveStart;
                }
                const startCountingStr = `${startCountingDate.getFullYear()}-${String(startCountingDate.getMonth() + 1).padStart(2, '0')}-${String(startCountingDate.getDate()).padStart(2, '0')}`;

                // Calculate trackable days for this habit
                if (startCountingDate <= endDate) {
                    const diffTime = Math.abs(endDate.getTime() - startCountingDate.getTime());
                    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    totalPossible += days;

                    // Count completions for this habit within valid range
                    // Iterate days to be safe? Or filter the set?
                    // Filtering the set is efficient enough

                    // Optimization: We could iterate days, or check completions.
                    // Given we have a Set of all completions, iterating the set is O(C).
                    // But we want completions FOR THIS HABIT.
                    // Let's filter completions again or just iterate the days if easier.
                    // Iterating days is safer for regex date checks.

                    // Actually, we can just check the cached completions for this habit in range.
                    const habitCompletionsInRange = monthCompletions.filter(c =>
                        c.habit_id === habit.id &&
                        c.completed_date >= startCountingStr &&
                        c.completed_date <= endDateStr
                    );
                    // Use Set to ensure uniqueness
                    const uniqueDates = new Set(habitCompletionsInRange.map(c => c.completed_date));
                    totalCompleted += uniqueDates.size;
                }
            });

            return { totalPossible, totalCompleted };
        };

        const currentStats = calculateMonthStats(currentDate, currentMonthStr);
        const overallRate = currentStats.totalPossible > 0 ? Math.round((currentStats.totalCompleted / currentStats.totalPossible) * 100) : 0;

        // If it's the start (Jan 2026), don't compare with previous month
        if (isStartOfTime) {
            return {
                overallRate,
                totalCompleted: currentStats.totalCompleted,
                totalPossible: currentStats.totalPossible,
                habitsTracked: habits.length,
                rateDiff: 0,
                completedDiff: 0,
                prevRate: 0,
                isStart: true // Flag to hide comparison UI
            };
        }

        // Previous Month Stats
        const prevStats = calculateMonthStats(prevDate, prevMonthStr);
        const prevRate = prevStats.totalPossible > 0 ? Math.round((prevStats.totalCompleted / prevStats.totalPossible) * 100) : 0;

        const rateDiff = overallRate - prevRate;
        const completedDiff = currentStats.totalCompleted - prevStats.totalCompleted;

        return {
            overallRate,
            totalCompleted: currentStats.totalCompleted,
            totalPossible: currentStats.totalPossible,
            habitsTracked: habits.length,
            rateDiff,
            completedDiff,
            prevRate,
            isStart: false
        };
    }, [habits, completions, currentDate]);

    // Check if habit is completed on a specific day
    const isCompleted = (habitId: string, day: number) => {
        if (!currentDate) return false;
        const dateStr = formatDate(currentDate, day);
        return completions.some(
            (c) => c.habit_id === habitId && c.completed_date === dateStr
        );
    };

    // Toggle completion
    const toggleCompletion = async (habitId: string, day: number) => {
        if (!currentDate) return;
        const dateStr = formatDate(currentDate, day);

        // Anti-cheat: 
        // 1. Prevent anything before Jan 1, 2026
        // 2. Prevent future dates
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        if (dateStr < '2026-01-01') return;
        if (dateStr > todayStr) return;

        const existing = completions.find(
            (c) => c.habit_id === habitId && c.completed_date === dateStr
        );

        if (existing) {
            const { error } = await supabase
                .from('habit_completions')
                .delete()
                .eq('id', existing.id);

            if (error) {
                console.error('Error removing completion:', error);
                return;
            }
            setCompletions(completions.filter((c) => c.id !== existing.id));
        } else {
            const { data, error } = await supabase
                .from('habit_completions')
                .insert({ habit_id: habitId, completed_date: dateStr })
                .select()
                .single();

            if (error) {
                console.error('Error adding completion:', error);
                return;
            }
            setCompletions([...completions, data]);
        }
    };

    // Add new habit
    const addHabit = async () => {
        if (!newHabitName.trim()) return;

        const { data, error } = await supabase
            .from('habits')
            .insert({ name: newHabitName.trim(), sort_order: habits.length })
            .select()
            .single();

        if (error) {
            console.error('Error adding habit:', error);
            return;
        }

        setHabits([...habits, data]);
        setNewHabitName('');
        setIsModalOpen(false);
    };

    // Delete habit with confirmation
    const confirmDeleteHabit = async () => {
        if (!deleteModal.habit) return;

        const { error } = await supabase.from('habits').delete().eq('id', deleteModal.habit.id);

        if (error) {
            console.error('Error deleting habit:', error);
            return;
        }

        setHabits(habits.filter((h) => h.id !== deleteModal.habit!.id));
        setCompletions(completions.filter((c) => c.habit_id !== deleteModal.habit!.id));
        setDeleteModal({ open: false, habit: null });
        if (selectedHabit?.id === deleteModal.habit.id) {
            setSelectedHabit(null);
        }
    };

    // Navigate months
    const previousMonth = () => {
        if (!currentDate) return;
        // Restrict going before Jan 2026
        // If current is Jan 2026 (year 2026, month 0), do not go back
        if (currentDate.getFullYear() === 2026 && currentDate.getMonth() === 0) return;

        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        if (!currentDate) return;
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthName = currentDate?.toLocaleString('default', { month: 'long', year: 'numeric' }) || '';
    const daysInMonth = currentDate ? getDaysInMonth(currentDate) : 31;
    const firstDayOfMonth = currentDate ? getFirstDayOfMonth(currentDate) : 0;

    // Check if we can go back
    const canGoBack = currentDate ? !(currentDate.getFullYear() === 2026 && currentDate.getMonth() === 0) : true;

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addHabit();
        } else if (e.key === 'Escape') {
            setIsModalOpen(false);
            setNewHabitName('');
        }
    };

    // Show loading while date initializes
    if (!currentDate) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-porcelain border-t-royal rounded-full animate-spin" />
            </div>
        );
    }

    // Show config error
    if (!isSupabaseConfigured) {
        return (
            <div className="bg-white/90 backdrop-blur-2xl border border-china/10 rounded-3xl p-8 md:p-12 shadow-xl text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-dawn to-sky flex items-center justify-center">
                    <svg className="w-10 h-10 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-midnight mb-3">Supabase Not Configured</h3>
                <p className="text-china max-w-sm mx-auto">Please add your Supabase URL and anon key to .env.local</p>
            </div>
        );
    }

    return (
        <>

            <div className="bg-transparent">
                {/* Header with Controls */}
                <div className="px-4 sm:px-6 lg:px-8 py-5 md:py-6 border-b border-porcelain/50 bg-gradient-to-r from-white to-porcelain/30">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-sm border transition-all active:scale-95 text-midnight ${canGoBack
                                    ? 'bg-white border-porcelain hover:border-china hover:shadow-md'
                                    : 'bg-porcelain/50 border-transparent text-china/30 cursor-not-allowed'
                                    }`}
                                onClick={previousMonth}
                                disabled={!canGoBack}
                                aria-label="Previous month"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-midnight min-w-[140px] sm:min-w-[180px] text-center tracking-tight">
                                {monthName}
                            </h2>
                            <button
                                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl shadow-sm border border-porcelain hover:border-china hover:shadow-md transition-all active:scale-95 text-midnight"
                                onClick={nextMonth}
                                aria-label="Next month"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* View Toggle */}
                            <div className="flex bg-porcelain/50 rounded-xl p-1">
                                <button
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-midnight' : 'text-china hover:text-midnight'}`}
                                    onClick={() => { setViewMode('grid'); setSelectedHabit(null); }}
                                >
                                    Grid
                                </button>
                                <button
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-midnight' : 'text-china hover:text-midnight'}`}
                                    onClick={() => setViewMode('calendar')}
                                >
                                    Calendar
                                </button>
                            </div>

                            <button
                                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${showStats
                                    ? 'bg-royal/10 text-royal border-royal/20'
                                    : 'bg-white text-china border-porcelain hover:border-royal/30 hover:text-midnight'}`}
                                onClick={() => setShowStats(!showStats)}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Stats</span>
                            </button>

                            <button
                                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-royal to-china text-white rounded-xl text-sm font-semibold shadow-lg shadow-royal/25 hover:shadow-xl hover:shadow-royal/30 hover:-translate-y-0.5 transition-all active:scale-95"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="hidden sm:inline">Add Habit</span>
                                <span className="sm:hidden">Add</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Panel - Shown at Top */}
                {overallStats && showStats && (
                    <div className="mx-4 sm:mx-6 lg:mx-8 mb-6 bg-white/70 backdrop-blur-sm border border-china/10 rounded-2xl p-4 sm:p-5 shadow-sm animate-fade-in-down">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-gradient-to-br from-royal/5 to-china/5 rounded-xl">
                                <p className="text-2xl sm:text-3xl font-bold text-royal">{overallStats.overallRate}%</p>
                                <p className="text-xs text-china mt-1">Completion Rate</p>
                                {!overallStats.isStart && overallStats.rateDiff !== 0 && (
                                    <div className={`text-[10px] font-bold mt-1 ${overallStats.rateDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {overallStats.rateDiff > 0 ? '↑' : '↓'} {Math.abs(overallStats.rateDiff)}% vs last mo
                                    </div>
                                )}
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                                <p className="text-2xl sm:text-3xl font-bold text-green-600">{overallStats.totalCompleted}</p>
                                <p className="text-xs text-green-700 mt-1">Tasks Completed</p>
                                {!overallStats.isStart && overallStats.completedDiff !== 0 && (
                                    <div className={`text-[10px] font-bold mt-1 ${overallStats.completedDiff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {overallStats.completedDiff > 0 ? '↑' : '↓'} {Math.abs(overallStats.completedDiff)} vs last mo
                                    </div>
                                )}
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl">
                                <p className="text-2xl sm:text-3xl font-bold text-purple-600">{overallStats.habitsTracked}</p>
                                <p className="text-xs text-purple-700 mt-1">Habits Tracked</p>
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                                <p className="text-2xl sm:text-3xl font-bold text-amber-600">{maximRatings.length}</p>
                                <p className="text-xs text-amber-700 mt-1">Quotes Liked</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-porcelain border-t-royal rounded-full animate-spin" />
                    </div>
                ) : habits.length === 0 ? (
                    <div className="text-center py-16 md:py-24 px-6">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-dawn to-sky flex items-center justify-center">
                            <svg className="w-12 h-12 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-midnight mb-2">Start Your Journey</h3>
                        <p className="text-china max-w-xs mx-auto mb-6">Add your first habit and begin building consistency!</p>
                        <button
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-royal to-china text-white rounded-xl text-sm font-semibold shadow-lg shadow-royal/25 hover:shadow-xl transition-all"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Create First Habit
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Grid View */
                    <div className="relative">
                        <div className="flex">
                            {/* Sticky habit names */}
                            <div className="flex-shrink-0 w-28 sm:w-36 md:w-48 bg-white z-10 border-r border-porcelain/50">
                                <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center bg-gradient-to-b from-porcelain/50 to-white border-b border-porcelain/30">
                                    <span className="text-xs font-bold text-china uppercase tracking-wider">Habit</span>
                                </div>
                                {habits.map((habit) => {
                                    const stats = calculateStats(habit.id);
                                    return (
                                        <div
                                            key={habit.id}
                                            className="h-14 sm:h-16 px-3 sm:px-4 flex items-center gap-2 border-b border-porcelain/30 group hover:bg-dawn/30 transition-colors cursor-pointer"
                                            onClick={() => { setViewMode('calendar'); setSelectedHabit(habit); }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-midnight truncate block">
                                                    {habit.name}
                                                </span>
                                                <span className="text-xs text-china">{stats.completionRate}%</span>
                                            </div>
                                            <button
                                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center text-china/60 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, habit }); }}
                                                aria-label={`Delete ${habit.name}`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Scrollable calendar grid */}
                            <div className="flex-1 overflow-x-auto scrollbar-thin">
                                <div className="min-w-max">
                                    <div className="flex h-14 sm:h-16 bg-gradient-to-b from-porcelain/50 to-white border-b border-porcelain/30">
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                            const today = isToday(day);
                                            return (
                                                <div
                                                    key={day}
                                                    className={`w-10 sm:w-11 md:w-12 flex-shrink-0 flex flex-col items-center justify-center ${today ? 'relative' : ''}`}
                                                >
                                                    {today && (
                                                        <div className="absolute inset-1 bg-gradient-to-br from-royal to-china rounded-xl opacity-10" />
                                                    )}
                                                    <span className={`text-sm sm:text-base font-bold ${today ? 'text-royal' : 'text-midnight'}`}>
                                                        {day}
                                                    </span>
                                                    <span className={`text-[10px] font-medium ${today ? 'text-royal' : 'text-china/60'}`}>
                                                        {getDayOfWeek(currentDate, day)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {habits.map((habit) => (
                                        <div key={habit.id} className="flex h-14 sm:h-16 border-b border-porcelain/30 hover:bg-dawn/20 transition-colors">
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                                const completed = isCompleted(habit.id, day);
                                                const today = isToday(day);
                                                const beforeCreation = isBeforeCreation(habit, day);
                                                return (
                                                    <div
                                                        key={day}
                                                        className="w-10 sm:w-11 md:w-12 flex-shrink-0 flex items-center justify-center p-1"
                                                    >
                                                        {beforeCreation ? (
                                                            // Empty/disabled cell for days before habit creation
                                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-transparent" />
                                                        ) : (
                                                            <button
                                                                className={`
                                w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all transform
                                ${completed
                                                                        ? today
                                                                            ? 'bg-gradient-to-br from-midnight to-royal shadow-md'
                                                                            : 'bg-gradient-to-br from-royal to-china shadow-md'
                                                                        : today
                                                                            ? 'bg-dawn/50 border-2 border-royal/30 hover:border-royal hover:bg-dawn'
                                                                            : 'bg-porcelain/50 border-2 border-transparent hover:border-china/30 hover:bg-porcelain'
                                                                    }
                                hover:scale-110 active:scale-95
                              `}
                                                                onClick={() => toggleCompletion(habit.id, day)}
                                                                aria-label={`${completed ? 'Unmark' : 'Mark'} ${habit.name} for day ${day}`}
                                                            >
                                                                {completed && (
                                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Calendar View - Per Habit */
                    <div className="p-4 sm:p-6">
                        {/* Habit Selector */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {habits.map((habit) => (
                                <button
                                    key={habit.id}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedHabit?.id === habit.id
                                        ? 'bg-gradient-to-r from-royal to-china text-white shadow-md'
                                        : 'bg-porcelain/50 text-midnight hover:bg-porcelain'
                                        }`}
                                    onClick={() => setSelectedHabit(habit)}
                                >
                                    {habit.name}
                                </button>
                            ))}
                        </div>

                        {selectedHabit ? (
                            <>
                                {/* Habit Stats */}
                                {(() => {
                                    const stats = calculateStats(selectedHabit.id);
                                    return (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                            <div className="bg-gradient-to-br from-royal/10 to-china/10 rounded-xl p-4 text-center">
                                                <p className="text-2xl sm:text-3xl font-bold text-royal">{stats.completionRate}%</p>
                                                <p className="text-xs text-china mt-1">Completion Rate</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-4 text-center">
                                                <p className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.currentStreak}</p>
                                                <p className="text-xs text-amber-700 mt-1">Current Streak 🔥</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-4 text-center">
                                                <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.bestStreak}</p>
                                                <p className="text-xs text-green-700 mt-1">Best Streak 🏆</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl p-4 text-center">
                                                <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.totalCompleted}/{stats.totalDays}</p>
                                                <p className="text-xs text-purple-700 mt-1">Days Completed</p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Calendar Grid */}
                                <div className="bg-porcelain/30 rounded-2xl p-4">
                                    {/* Day names header */}
                                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                            <div key={day} className="text-center text-xs font-semibold text-china py-2">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar days */}
                                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                        {/* Empty cells for days before month starts */}
                                        {Array.from({ length: firstDayOfMonth }, (_, i) => (
                                            <div key={`empty-${i}`} className="aspect-square" />
                                        ))}

                                        {/* Actual days */}
                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                            const completed = isCompleted(selectedHabit.id, day);
                                            const today = isToday(day);
                                            const beforeCreation = isBeforeCreation(selectedHabit, day);

                                            if (beforeCreation) {
                                                // Disabled cell for days before habit creation
                                                return (
                                                    <div
                                                        key={day}
                                                        className="aspect-square rounded-xl flex flex-col items-center justify-center bg-porcelain/30 text-china/40 cursor-not-allowed"
                                                    >
                                                        <span className="text-sm sm:text-base font-semibold">
                                                            {day}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={day}
                                                    className={`
                            aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                            ${completed
                                                            ? 'bg-gradient-to-br from-royal to-china text-white shadow-md'
                                                            : today
                                                                ? 'bg-white border-2 border-royal text-midnight shadow-sm'
                                                                : 'bg-white hover:bg-dawn/50 text-midnight'
                                                        }
                            hover:scale-105 active:scale-95
                          `}
                                                    onClick={() => toggleCompletion(selectedHabit.id, day)}
                                                >
                                                    <span className={`text-sm sm:text-base font-semibold ${completed ? 'text-white' : ''}`}>
                                                        {day}
                                                    </span>
                                                    {completed && (
                                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-china">
                                <p>Select a habit above to view its calendar</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Full Screen Add Habit Modal */}
            {isModalOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-fade-in"
                    onClick={() => setIsModalOpen(false)}
                >
                    {/* Close Button */}
                    <button
                        className="absolute top-6 right-6 p-2 text-china/50 hover:text-midnight transition-colors"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div
                        className="w-full max-w-4xl px-6 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-dawn to-sky shadow-lg shadow-royal/10">
                            <svg className="w-10 h-10 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>

                        <h3 className="text-4xl md:text-5xl font-bold text-midnight mb-4 tracking-tight">New Habit</h3>
                        <p className="text-xl text-china mb-12 font-medium">What positive change do you want to make?</p>

                        <div className="relative max-w-2xl mx-auto">
                            <input
                                type="text"
                                className="w-full px-0 py-4 text-center text-3xl md:text-4xl font-bold text-midnight bg-transparent border-b-2 border-porcelain focus:border-royal focus:outline-none placeholder:text-china/20 transition-all"
                                placeholder="e.g., Early Run"
                                value={newHabitName}
                                onChange={(e) => setNewHabitName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            <div className="mt-8 flex items-center justify-center gap-4 opacity-60">
                                <span className="text-sm font-medium text-china flex items-center gap-2">
                                    <kbd className="px-2 py-1 bg-porcelain rounded-lg text-xs">Enter</kbd> to save
                                </span>
                                <span className="text-china/30 text-sm">|</span>
                                <span className="text-sm font-medium text-china flex items-center gap-2">
                                    <kbd className="px-2 py-1 bg-porcelain rounded-lg text-xs">Esc</kbd> to cancel
                                </span>
                            </div>
                        </div>

                        <div className="mt-12 flex justify-center gap-4">
                            <button
                                className="px-8 py-4 bg-porcelain text-midnight rounded-2xl text-lg font-semibold hover:bg-dawn transition-all active:scale-95"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-8 py-4 bg-gradient-to-r from-royal to-china text-white rounded-2xl text-lg font-semibold shadow-xl shadow-royal/20 hover:shadow-2xl hover:shadow-royal/30 hover:-translate-y-1 transition-all active:scale-95 w-48"
                                onClick={addHabit}
                            >
                                Start Tracking
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.open && deleteModal.habit && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 bg-midnight/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
                    onClick={() => setDeleteModal({ open: false, habit: null })}
                >
                    <div
                        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-midnight text-center mb-2">Delete Habit?</h3>
                        <p className="text-china text-center text-sm mb-6">
                            Are you sure you want to delete <span className="font-semibold text-midnight">&quot;{deleteModal.habit.name}&quot;</span>? This will remove all tracking data.
                        </p>
                        <div className="flex gap-3">
                            <button
                                className="flex-1 px-4 py-3.5 bg-porcelain text-midnight rounded-xl text-sm font-semibold hover:bg-dawn transition-colors active:scale-95"
                                onClick={() => setDeleteModal({ open: false, habit: null })}
                            >
                                Keep It
                            </button>
                            <button
                                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-500/25 hover:shadow-xl transition-all active:scale-95"
                                onClick={confirmDeleteHabit}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}


        </>
    );
}
