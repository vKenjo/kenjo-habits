'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

interface HabitStats {
    completionRate: number;
    currentStreak: number;
    bestStreak: number;
    totalCompleted: number;
    totalDays: number;
}

export default function HabitTracker() {
    const [currentDate, setCurrentDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; habitId: Id<"habits"> | null; habitName: string }>({ open: false, habitId: null, habitName: '' });
    const [newHabitName, setNewHabitName] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
    const [selectedHabitId, setSelectedHabitId] = useState<Id<"habits"> | null>(null);
    const [showStats, setShowStats] = useState(false);

    // Initialize date on client side to avoid hydration mismatch
    useEffect(() => {
        setCurrentDate(new Date());
    }, []);

    // Compute date range for completions query
    const dateRange = useMemo(() => {
        if (!currentDate) return null;
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        return {
            startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
            endDate: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
        };
    }, [currentDate]);

    // Compute maxim ratings date range (Unix ms)
    const maximDateRange = useMemo(() => {
        if (!currentDate) return null;
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
        return { startDate: start.getTime(), endDate: end.getTime() };
    }, [currentDate]);

    // Convex reactive queries
    const habits = useQuery(api.habits.list) ?? [];
    const completions = useQuery(
        api.habitCompletions.listByDateRange,
        dateRange ?? "skip"
    ) ?? [];
    const maximRatings = useQuery(
        api.maximRatings.getPositiveByDateRange,
        maximDateRange ?? "skip"
    ) ?? [];

    // Convex mutations
    const createHabit = useMutation(api.habits.create);
    const removeHabit = useMutation(api.habits.remove);
    const toggleCompletionMut = useMutation(api.habitCompletions.toggle);

    const isLoading = currentDate !== null && habits === undefined;

    // Helpers
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getDayOfWeek = (date: Date, day: number) => {
        const d = new Date(date.getFullYear(), date.getMonth(), day);
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return days[d.getDay()];
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const formatDate = (date: Date, day: number) => {
        const d = new Date(date.getFullYear(), date.getMonth(), day);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const isToday = (day: number) => {
        if (!currentDate) return false;
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === currentDate.getMonth() &&
            today.getFullYear() === currentDate.getFullYear()
        );
    };

    // Parse createdAt (now a Unix ms number) to local midnight Date
    const parseCreatedAt = (createdAt: number): Date => {
        const d = new Date(createdAt);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    // Check if a day is before the habit's creation date
    const isBeforeCreation = (habitCreatedAt: number, day: number): boolean => {
        if (!currentDate) return false;
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const createdDate = parseCreatedAt(habitCreatedAt);
        return dayDate < createdDate;
    };

    // Calculate stats for a habit
    const calculateStats = useCallback((habitId: Id<"habits">): HabitStats => {
        const habit = habits.find(h => h._id === habitId);
        if (!currentDate || !habit) return { completionRate: 0, currentStreak: 0, bestStreak: 0, totalCompleted: 0, totalDays: 0 };

        const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        const habitCompletions = completions.filter(c =>
            c.habitId === habitId &&
            c.completedDate.startsWith(currentMonthStr)
        );
        const uniqueDates = new Set(habitCompletions.map(c => c.completedDate));

        const today = new Date();
        const daysInMonth = getDaysInMonth(currentDate);
        const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

        const firstDayOfMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        let earliestRelevantCompletion: Date | null = null;
        if (habitCompletions.length > 0) {
            const dates = habitCompletions.map(c => c.completedDate).sort();
            if (dates.length > 0) {
                const [year, month, day] = dates[0].split('-').map(Number);
                earliestRelevantCompletion = new Date(year, month - 1, day);
            }
        }

        const createdAtDate = parseCreatedAt(habit.createdAt);

        let effectiveStart = createdAtDate;
        if (earliestRelevantCompletion && earliestRelevantCompletion < createdAtDate) {
            effectiveStart = earliestRelevantCompletion;
        }

        let startCountingDate = firstDayOfMonthDate;
        if (effectiveStart > firstDayOfMonthDate) {
            startCountingDate = effectiveStart;
        }

        const endCountingDate = isCurrentMonth ? today : new Date(currentDate.getFullYear(), currentDate.getMonth(), daysInMonth);
        endCountingDate.setHours(0, 0, 0, 0);

        let totalDays = 0;
        if (startCountingDate <= endCountingDate) {
            const diffTime = Math.abs(endCountingDate.getTime() - startCountingDate.getTime());
            totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        let totalCompleted = 0;
        const startCountingStr = `${startCountingDate.getFullYear()}-${String(startCountingDate.getMonth() + 1).padStart(2, '0')}-${String(startCountingDate.getDate()).padStart(2, '0')}`;
        const endCountingStr = `${endCountingDate.getFullYear()}-${String(endCountingDate.getMonth() + 1).padStart(2, '0')}-${String(endCountingDate.getDate()).padStart(2, '0')}`;

        uniqueDates.forEach(date => {
            if (date >= startCountingStr && date <= endCountingStr) {
                totalCompleted++;
            }
        });

        const completionRate = totalDays > 0 ? Math.round((totalCompleted / totalDays) * 100) : 0;

        let bestStreak = 0;
        let tempStreak = 0;

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = formatDate(currentDate, i);
            if (dateStr < startCountingStr) continue;
            if (dateStr > endCountingStr) break;

            if (uniqueDates.has(dateStr)) {
                tempStreak++;
                if (tempStreak > bestStreak) bestStreak = tempStreak;
            } else {
                tempStreak = 0;
            }
        }

        let currentStreak = 0;
        const lastCheckDay = isCurrentMonth ? today.getDate() : daysInMonth;

        for (let i = lastCheckDay; i >= 1; i--) {
            const dateStr = formatDate(currentDate, i);
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
        const isStartOfTime = currentDate.getFullYear() === 2026 && currentDate.getMonth() === 0;

        const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        const calculateMonthStats = (date: Date, monthStr: string) => {
            const today = new Date();
            const daysInMonth = getDaysInMonth(date);
            const isCurrentMonth = today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear();

            const endDate = isCurrentMonth ? today : new Date(date.getFullYear(), date.getMonth(), daysInMonth);
            endDate.setHours(0, 0, 0, 0);
            const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

            const monthCompletions = completions.filter(c => c.completedDate.startsWith(monthStr));

            let totalPossible = 0;
            let totalCompleted = 0;

            habits.forEach(habit => {
                const firstDayOfMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
                const createdAtDate = parseCreatedAt(habit.createdAt);

                const habitCompletionsInMonth = monthCompletions.filter(c => c.habitId === habit._id);
                let earliestCompletion: Date | null = null;
                if (habitCompletionsInMonth.length > 0) {
                    const sorted = habitCompletionsInMonth.map(c => c.completedDate).sort();
                    const [year, month, day] = sorted[0].split('-').map(Number);
                    earliestCompletion = new Date(year, month - 1, day);
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

                if (startCountingDate <= endDate) {
                    const diffTime = Math.abs(endDate.getTime() - startCountingDate.getTime());
                    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    totalPossible += days;

                    const habitCompletionsInRange = monthCompletions.filter(c =>
                        c.habitId === habit._id &&
                        c.completedDate >= startCountingStr &&
                        c.completedDate <= endDateStr
                    );
                    const uniqueDates = new Set(habitCompletionsInRange.map(c => c.completedDate));
                    totalCompleted += uniqueDates.size;
                }
            });

            return { totalPossible, totalCompleted };
        };

        const currentStats = calculateMonthStats(currentDate, currentMonthStr);
        const overallRate = currentStats.totalPossible > 0 ? Math.round((currentStats.totalCompleted / currentStats.totalPossible) * 100) : 0;

        if (isStartOfTime) {
            return {
                overallRate,
                totalCompleted: currentStats.totalCompleted,
                totalPossible: currentStats.totalPossible,
                habitsTracked: habits.length,
                rateDiff: 0,
                completedDiff: 0,
                prevRate: 0,
                isStart: true
            };
        }

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
    const isCompleted = (habitId: Id<"habits">, day: number) => {
        if (!currentDate) return false;
        const dateStr = formatDate(currentDate, day);
        return completions.some(
            (c) => c.habitId === habitId && c.completedDate === dateStr
        );
    };

    // Toggle completion
    const toggleCompletion = async (habitId: Id<"habits">, day: number) => {
        if (!currentDate) return;
        const dateStr = formatDate(currentDate, day);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        if (dateStr < '2026-01-01') return;
        if (dateStr > todayStr) return;

        try {
            await toggleCompletionMut({ habitId, completedDate: dateStr });
        } catch (error) {
            console.error('Error toggling completion:', error);
        }
    };

    // Add new habit
    const addHabit = async () => {
        if (!newHabitName.trim()) return;

        try {
            await createHabit({ name: newHabitName.trim(), sortOrder: habits.length });
            setNewHabitName('');
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error adding habit:', error);
        }
    };

    // Delete habit
    const confirmDeleteHabit = async () => {
        if (!deleteModal.habitId) return;

        try {
            await removeHabit({ id: deleteModal.habitId });
            setDeleteModal({ open: false, habitId: null, habitName: '' });
            if (selectedHabitId === deleteModal.habitId) {
                setSelectedHabitId(null);
            }
        } catch (error) {
            console.error('Error deleting habit:', error);
        }
    };

    // Navigate months
    const previousMonth = () => {
        if (!currentDate) return;
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

    const canGoBack = currentDate ? !(currentDate.getFullYear() === 2026 && currentDate.getMonth() === 0) : true;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addHabit();
        } else if (e.key === 'Escape') {
            setIsModalOpen(false);
            setNewHabitName('');
        }
    };

    const selectedHabit = habits.find(h => h._id === selectedHabitId) ?? null;

    // Show loading while date initializes
    if (!currentDate) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-porcelain border-t-royal rounded-full animate-spin" />
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
                                    onClick={() => { setViewMode('grid'); setSelectedHabitId(null); }}
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

                {/* Stats Panel */}
                {overallStats && showStats && (
                    <div className="mx-4 sm:mx-6 lg:mx-8 mb-6 bg-white/70 backdrop-blur-sm border border-china/10 rounded-2xl p-4 sm:p-5 shadow-sm animate-fade-in-down">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-gradient-to-br from-royal/5 to-china/5 rounded-xl">
                                <p className="text-2xl sm:text-3xl font-bold text-royal">{overallStats.overallRate}%</p>
                                <p className="text-xs text-china mt-1">Completion Rate</p>
                                {!overallStats.isStart && overallStats.rateDiff !== 0 && (
                                    <div className={`text-[10px] font-bold mt-1 ${overallStats.rateDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {overallStats.rateDiff > 0 ? '\u2191' : '\u2193'} {Math.abs(overallStats.rateDiff)}% vs last mo
                                    </div>
                                )}
                            </div>
                            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                                <p className="text-2xl sm:text-3xl font-bold text-green-600">{overallStats.totalCompleted}</p>
                                <p className="text-xs text-green-700 mt-1">Tasks Completed</p>
                                {!overallStats.isStart && overallStats.completedDiff !== 0 && (
                                    <div className={`text-[10px] font-bold mt-1 ${overallStats.completedDiff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {overallStats.completedDiff > 0 ? '\u2191' : '\u2193'} {Math.abs(overallStats.completedDiff)} vs last mo
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
                                    const stats = calculateStats(habit._id);
                                    return (
                                        <div
                                            key={habit._id}
                                            className="h-14 sm:h-16 px-3 sm:px-4 flex items-center gap-2 border-b border-porcelain/30 group hover:bg-dawn/30 transition-colors cursor-pointer"
                                            onClick={() => { setViewMode('calendar'); setSelectedHabitId(habit._id); }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-midnight truncate block">
                                                    {habit.name}
                                                </span>
                                                <span className="text-xs text-china">{stats.completionRate}%</span>
                                            </div>
                                            <button
                                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center text-china/60 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, habitId: habit._id, habitName: habit.name }); }}
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
                                        <div key={habit._id} className="flex h-14 sm:h-16 border-b border-porcelain/30 hover:bg-dawn/20 transition-colors">
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                                const completed = isCompleted(habit._id, day);
                                                const today = isToday(day);
                                                const beforeCreation = isBeforeCreation(habit.createdAt, day);
                                                return (
                                                    <div
                                                        key={day}
                                                        className="w-10 sm:w-11 md:w-12 flex-shrink-0 flex items-center justify-center p-1"
                                                    >
                                                        {beforeCreation ? (
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
                                                                onClick={() => toggleCompletion(habit._id, day)}
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
                                    key={habit._id}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedHabitId === habit._id
                                        ? 'bg-gradient-to-r from-royal to-china text-white shadow-md'
                                        : 'bg-porcelain/50 text-midnight hover:bg-porcelain'
                                        }`}
                                    onClick={() => setSelectedHabitId(habit._id)}
                                >
                                    {habit.name}
                                </button>
                            ))}
                        </div>

                        {selectedHabit ? (
                            <>
                                {/* Habit Stats */}
                                {(() => {
                                    const stats = calculateStats(selectedHabit._id);
                                    return (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                            <div className="bg-gradient-to-br from-royal/10 to-china/10 rounded-xl p-4 text-center">
                                                <p className="text-2xl sm:text-3xl font-bold text-royal">{stats.completionRate}%</p>
                                                <p className="text-xs text-china mt-1">Completion Rate</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-4 text-center">
                                                <p className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.currentStreak}</p>
                                                <p className="text-xs text-amber-700 mt-1">Current Streak {'\uD83D\uDD25'}</p>
                                            </div>
                                            <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-4 text-center">
                                                <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.bestStreak}</p>
                                                <p className="text-xs text-green-700 mt-1">Best Streak {'\uD83C\uDFC6'}</p>
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
                                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                            <div key={day} className="text-center text-xs font-semibold text-china py-2">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                        {Array.from({ length: firstDayOfMonth }, (_, i) => (
                                            <div key={`empty-${i}`} className="aspect-square" />
                                        ))}

                                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                            const completed = isCompleted(selectedHabit._id, day);
                                            const today = isToday(day);
                                            const beforeCreation = isBeforeCreation(selectedHabit.createdAt, day);

                                            if (beforeCreation) {
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
                                                    onClick={() => toggleCompletion(selectedHabit._id, day)}
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
            {deleteModal.open && deleteModal.habitId && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 bg-midnight/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
                    onClick={() => setDeleteModal({ open: false, habitId: null, habitName: '' })}
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
                            Are you sure you want to delete <span className="font-semibold text-midnight">&quot;{deleteModal.habitName}&quot;</span>? This will remove all tracking data.
                        </p>
                        <div className="flex gap-3">
                            <button
                                className="flex-1 px-4 py-3.5 bg-porcelain text-midnight rounded-xl text-sm font-semibold hover:bg-dawn transition-colors active:scale-95"
                                onClick={() => setDeleteModal({ open: false, habitId: null, habitName: '' })}
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
