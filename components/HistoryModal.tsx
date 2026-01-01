'use client';

import { useState, useEffect } from 'react';
import { dailyBooks } from '@/lib/dailyBooks';

interface HistoryData {
    date: string;
    journal: string;
    readings: { book_id: string; rating: number }[];
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function HistoryModal({ onClose }: { onClose: () => void }) {
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [history, setHistory] = useState<HistoryData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/history?date=${selectedDate}`);
                const data = await res.json();
                setHistory(data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [selectedDate]);

    // Calendar helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentMonth);

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentMonth(newDate);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-midnight/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col md:flex-row animate-slide-up">

                {/* Close Button Mobile */}
                <button onClick={onClose} className="absolute top-4 right-4 md:hidden z-10 p-2 bg-porcelain rounded-full">
                    <svg className="w-5 h-5 text-midnight" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Left: Calendar Sidebar */}
                <div className="md:w-1/3 bg-porcelain/30 border-r border-china/10 p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-midnight mb-6">History</h2>

                    {/* Month Nav */}
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-lg transition-colors">
                            <svg className="w-5 h-5 text-china" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-sm font-semibold text-midnight">
                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-lg transition-colors">
                            <svg className="w-5 h-5 text-china" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 mb-2">
                        {WEEKDAYS.map(day => (
                            <div key={day} className="text-center text-xs font-medium text-china/50 py-1">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: days }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = selectedDate === dateStr;
                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`aspect-square rounded-lg text-sm flex items-center justify-center transition-all ${isSelected ? 'bg-royal text-white font-bold shadow-md' : 'hover:bg-white hover:shadow-sm text-midnight'
                                        }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Details Content */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white/50">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-xs font-medium text-china uppercase tracking-wider mb-1">Overview for</p>
                            <h3 className="text-2xl font-bold text-midnight">
                                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h3>
                        </div>
                        <button onClick={onClose} className="hidden md:block p-2 hover:bg-porcelain rounded-xl transition-colors">
                            <svg className="w-5 h-5 text-china" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-royal/30 border-t-royal animate-spin" /></div>
                    ) : (
                        <div className="space-y-8">
                            {/* Readings Section */}
                            <section>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-midnight mb-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-royal" />
                                    Daily Readings
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {dailyBooks.map(book => {
                                        const rating = history?.readings.find(r => r.book_id === book.id)?.rating;
                                        return (
                                            <div key={book.id} className={`p-3 rounded-xl border flex items-center gap-3 ${rating ? 'bg-white border-china/10 shadow-sm' : 'bg-porcelain/30 border-transparent opacity-60'
                                                }`}>
                                                <div className="w-8 h-8 rounded-lg bg-porcelain flex items-center justify-center text-lg">
                                                    {book.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-midnight">{book.shortTitle}</p>
                                                    <p className="text-[10px] text-china/60">{book.author}</p>
                                                </div>
                                                {rating ? (
                                                    <div className="text-xl" title={`Rated: ${rating}/5`}>
                                                        {['😔', '😐', '🙂', '😊', '🤩'][rating - 1]}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-china/40 font-medium">Missed</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Journal Section */}
                            <section>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-midnight mb-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                    Journal Entry
                                </h4>
                                <div className="bg-white rounded-2xl p-5 border border-china/5 shadow-sm min-h-[120px]">
                                    {history?.journal ? (
                                        <p className="text-sm text-midnight/80 leading-relaxed whitespace-pre-wrap font-serif">
                                            {history.journal}
                                        </p>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-china/40 py-4">
                                            <p className="text-sm italic">No journal entry for this day.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
