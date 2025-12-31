'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, Habit, HabitCompletion } from '@/lib/supabase';

export default function HabitTracker() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [completions, setCompletions] = useState<HabitCompletion[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newHabitName, setNewHabitName] = useState('');

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
        if (!isSupabaseConfigured) return;
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
        if (!isSupabaseConfigured) return;
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchHabits(), fetchCompletions()]);
            setIsLoading(false);
        };
        loadData();
    }, [fetchHabits, fetchCompletions]);

    // Check if habit is completed on a specific day
    const isCompleted = (habitId: string, day: number) => {
        const dateStr = formatDate(currentDate, day);
        return completions.some(
            (c) => c.habit_id === habitId && c.completed_date === dateStr
        );
    };

    // Toggle completion
    const toggleCompletion = async (habitId: string, day: number) => {
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

    // Delete habit
    const deleteHabit = async (habitId: string) => {
        const { error } = await supabase.from('habits').delete().eq('id', habitId);

        if (error) {
            console.error('Error deleting habit:', error);
            return;
        }

        setHabits(habits.filter((h) => h.id !== habitId));
        setCompletions(completions.filter((c) => c.habit_id !== habitId));
    };

    // Navigate months
    const previousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const daysInMonth = getDaysInMonth(currentDate);

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addHabit();
        } else if (e.key === 'Escape') {
            setIsModalOpen(false);
            setNewHabitName('');
        }
    };

    // Show config error
    if (!isSupabaseConfigured) {
        return (
            <div className="bg-white/80 backdrop-blur-xl border border-china/20 rounded-2xl p-8 shadow-lg text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-china/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-semibold text-midnight mb-2">Supabase Not Configured</h3>
                <p className="text-china">Please add your Supabase URL and anon key to .env.local</p>
            </div>
        );
    }

    return (
        <div className="bg-white/80 backdrop-blur-xl border border-china/20 rounded-2xl p-6 shadow-lg">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button
                        className="flex items-center justify-center w-10 h-10 bg-porcelain rounded-xl hover:bg-dawn transition-all hover:-translate-y-0.5 text-midnight"
                        onClick={previousMonth}
                        aria-label="Previous month"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="text-2xl font-semibold text-midnight min-w-[180px] text-center">{monthName}</h2>
                    <button
                        className="flex items-center justify-center w-10 h-10 bg-porcelain rounded-xl hover:bg-dawn transition-all hover:-translate-y-0.5 text-midnight"
                        onClick={nextMonth}
                        aria-label="Next month"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <button
                    className="flex items-center gap-2 px-5 py-3 bg-royal text-white rounded-xl text-sm font-medium hover:bg-china transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    onClick={() => setIsModalOpen(true)}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Habit
                </button>
            </div>

            {/* Habit Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-10 h-10 border-3 border-porcelain border-t-royal rounded-full animate-spin" />
                </div>
            ) : habits.length === 0 ? (
                <div className="text-center py-16 text-china">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-midnight mb-2">No habits yet</h3>
                    <p className="text-sm">Click &quot;Add Habit&quot; to start tracking your daily habits</p>
                </div>
            ) : (
                <div className="overflow-x-auto pb-2">
                    <table className="w-full border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-porcelain">
                                <th className="py-3 px-4 text-left text-xs font-semibold text-midnight uppercase tracking-wide min-w-[180px] rounded-l-lg">
                                    Habit
                                </th>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                                    <th
                                        key={day}
                                        className={`py-2 px-1 text-center w-8 ${isToday(day) ? 'bg-royal text-white rounded-md' : ''}`}
                                    >
                                        <span className="block text-sm font-semibold">{day}</span>
                                        <span className={`block text-[10px] font-normal mt-0.5 ${isToday(day) ? 'text-white/80' : 'text-china'}`}>
                                            {getDayOfWeek(currentDate, day)}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {habits.map((habit) => (
                                <tr key={habit.id} className="group hover:bg-sky/20 transition-colors">
                                    <td className="py-2 px-4 border-b border-porcelain">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-midnight truncate max-w-[150px]">
                                                {habit.name}
                                            </span>
                                            <button
                                                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 text-china hover:text-royal hover:bg-royal/10 rounded transition-all"
                                                onClick={() => deleteHabit(habit.id)}
                                                aria-label={`Delete ${habit.name}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                        const completed = isCompleted(habit.id, day);
                                        const today = isToday(day);
                                        return (
                                            <td key={day} className="py-2 px-1 text-center border-b border-porcelain">
                                                <div
                                                    className={`
                            flex items-center justify-center w-7 h-7 mx-auto rounded-md cursor-pointer transition-all
                            border-2 hover:scale-110
                            ${completed
                                                            ? today
                                                                ? 'bg-midnight border-midnight animate-check-pop'
                                                                : 'bg-royal border-royal animate-check-pop'
                                                            : today
                                                                ? 'bg-dawn border-dawn hover:border-china'
                                                                : 'bg-white border-porcelain hover:border-china'
                                                        }
                          `}
                                                    onClick={() => toggleCompletion(habit.id, day)}
                                                    role="checkbox"
                                                    aria-checked={completed}
                                                    tabIndex={0}
                                                    onKeyDown={(e) => e.key === 'Enter' && toggleCompletion(habit.id, day)}
                                                >
                                                    {completed && (
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Habit Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-midnight/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-semibold text-midnight mb-6">Add New Habit</h3>
                        <input
                            type="text"
                            className="w-full px-4 py-3 border-2 border-porcelain rounded-xl text-base text-midnight focus:outline-none focus:border-royal transition-colors placeholder:text-china"
                            placeholder="Enter habit name..."
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        <div className="flex gap-3 mt-6">
                            <button
                                className="flex-1 px-4 py-3 bg-porcelain text-midnight rounded-xl text-sm font-medium hover:bg-dawn transition-colors"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setNewHabitName('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 px-4 py-3 bg-royal text-white rounded-xl text-sm font-medium hover:bg-china transition-colors"
                                onClick={addHabit}
                            >
                                Add Habit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
