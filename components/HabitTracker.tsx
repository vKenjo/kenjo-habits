'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, Habit, HabitCompletion } from '@/lib/supabase';

export default function HabitTracker() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [completions, setCompletions] = useState<HabitCompletion[]>([]);
    const [currentDate, setCurrentDate] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });
    const [newHabitName, setNewHabitName] = useState('');

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

    // Format date for database
    const formatDate = (date: Date, day: number) => {
        const d = new Date(date.getFullYear(), date.getMonth(), day);
        return d.toISOString().split('T')[0];
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
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const { data, error } = await supabase
            .from('habit_completions')
            .select('*')
            .gte('completed_date', startDate.toISOString().split('T')[0])
            .lte('completed_date', endDate.toISOString().split('T')[0]);

        if (error) {
            console.error('Error fetching completions:', error);
            return;
        }
        setCompletions(data || []);
    }, [currentDate]);

    // Load data
    useEffect(() => {
        if (!isSupabaseConfigured || !currentDate) return;
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchHabits(), fetchCompletions()]);
            setIsLoading(false);
        };
        loadData();
    }, [fetchHabits, fetchCompletions, currentDate]);

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
    };

    // Navigate months
    const previousMonth = () => {
        if (!currentDate) return;
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        if (!currentDate) return;
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthName = currentDate?.toLocaleString('default', { month: 'long', year: 'numeric' }) || '';
    const daysInMonth = currentDate ? getDaysInMonth(currentDate) : 31;

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
            <div className="bg-white/90 backdrop-blur-2xl border border-china/10 rounded-3xl shadow-xl overflow-hidden">
                {/* Header with Controls */}
                <div className="px-4 sm:px-6 lg:px-8 py-5 md:py-6 border-b border-porcelain/50 bg-gradient-to-r from-white to-porcelain/30">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl shadow-sm border border-porcelain hover:border-china hover:shadow-md transition-all active:scale-95 text-midnight"
                                onClick={previousMonth}
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

                {/* Habit Grid */}
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
                ) : (
                    <div className="relative">
                        {/* Fixed habit names column */}
                        <div className="flex">
                            {/* Sticky habit names */}
                            <div className="flex-shrink-0 w-28 sm:w-36 md:w-44 bg-white z-10 border-r border-porcelain/50">
                                {/* Header cell */}
                                <div className="h-14 sm:h-16 px-3 sm:px-4 flex items-center bg-gradient-to-b from-porcelain/50 to-white border-b border-porcelain/30">
                                    <span className="text-xs font-bold text-china uppercase tracking-wider">Habit</span>
                                </div>
                                {/* Habit names */}
                                {habits.map((habit) => (
                                    <div
                                        key={habit.id}
                                        className="h-12 sm:h-14 px-3 sm:px-4 flex items-center gap-2 border-b border-porcelain/30 group hover:bg-dawn/30 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-midnight truncate flex-1">
                                            {habit.name}
                                        </span>
                                        <button
                                            className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center text-china/60 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                            onClick={() => setDeleteModal({ open: true, habit })}
                                            aria-label={`Delete ${habit.name}`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Scrollable calendar grid */}
                            <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-china/20 scrollbar-track-transparent">
                                <div className="min-w-max">
                                    {/* Day headers */}
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
                                                        {currentDate && getDayOfWeek(currentDate, day)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Habit rows */}
                                    {habits.map((habit) => (
                                        <div key={habit.id} className="flex h-12 sm:h-14 border-b border-porcelain/30 hover:bg-dawn/20 transition-colors">
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                                const completed = isCompleted(habit.id, day);
                                                const today = isToday(day);
                                                return (
                                                    <div
                                                        key={day}
                                                        className="w-10 sm:w-11 md:w-12 flex-shrink-0 flex items-center justify-center p-1"
                                                    >
                                                        <button
                                                            className={`
                                w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all transform
                                ${completed
                                                                    ? today
                                                                        ? 'bg-gradient-to-br from-midnight to-royal shadow-md scale-100'
                                                                        : 'bg-gradient-to-br from-royal to-china shadow-md scale-100'
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
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Habit Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-midnight/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-dawn to-sky flex items-center justify-center">
                            <svg className="w-7 h-7 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-midnight text-center mb-2">Add New Habit</h3>
                        <p className="text-china text-center text-sm mb-6">What would you like to track daily?</p>
                        <input
                            type="text"
                            className="w-full px-4 py-3.5 border-2 border-porcelain rounded-xl text-base text-midnight bg-porcelain/30 focus:outline-none focus:border-royal focus:bg-white transition-all placeholder:text-china/50"
                            placeholder="e.g., Exercise, Read, Meditate..."
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        <div className="flex gap-3 mt-6">
                            <button
                                className="flex-1 px-4 py-3.5 bg-porcelain text-midnight rounded-xl text-sm font-semibold hover:bg-dawn transition-colors active:scale-95"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setNewHabitName('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-royal to-china text-white rounded-xl text-sm font-semibold shadow-lg shadow-royal/25 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                                onClick={addHabit}
                                disabled={!newHabitName.trim()}
                            >
                                Add Habit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.open && deleteModal.habit && (
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
                </div>
            )}
        </>
    );
}
