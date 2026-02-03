'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { dailyBooks, DailyBook } from '@/lib/dailyBooks';
import ReadingModal, { ReadingContent } from './ReadingModal';

interface MonthDayData {
    date: string;
    hasJournal: boolean;
    readings: { bookId: string; rating: number }[];
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const RATING_EMOJIS = ['😔', '😐', '🙂', '😊', '🤩'];
const RATING_LABELS = ['Not great', 'Okay', 'Good', 'Great', 'Amazing'];

export default function HistoryModal({ onClose }: { onClose: () => void }) {
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Reading State
    const [selectedReadBook, setSelectedReadBook] = useState<DailyBook | null>(null);
    const [readingDayOfYear, setReadingDayOfYear] = useState<number>(0);
    const [readingContent, setReadingContent] = useState<ReadingContent | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [contentError, setContentError] = useState<string | null>(null);
    const [isSavingRating, setIsSavingRating] = useState(false);

    // Convex reactive queries
    const history = useQuery(api.history.getByDate, { date: selectedDate });

    const monthRange = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
        return {
            startDate: `${year}-${month}-01`,
            endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
        };
    }, [currentMonth]);

    const monthData = useQuery(api.history.getByMonth, monthRange) as MonthDayData[] | undefined;

    const upsertRating = useMutation(api.readingRatings.upsert);

    const handleBookClick = async (book: DailyBook, dayOfYear: number) => {
        setSelectedReadBook(book);
        setReadingDayOfYear(dayOfYear);
        setIsLoadingContent(true);
        setContentError(null);

        try {
            const response = await fetch(`/api/reading?bookId=${book.id}&day=${dayOfYear}`);
            if (!response.ok) throw new Error('Failed to fetch content');
            const data = await response.json();
            setReadingContent(data);
        } catch (err) {
            setContentError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoadingContent(false);
        }
    };

    const handleRating = async (bookId: string, rating: number) => {
        const existingRating = history?.readings?.find(r => r.bookId === bookId)?.rating;

        if (existingRating && existingRating !== rating) {
            const confirmChange = window.confirm(
                `You previously rated this as ${RATING_LABELS[existingRating - 1]} (${RATING_EMOJIS[existingRating - 1]}).\nDo you want to update your reaction to ${RATING_LABELS[rating - 1]} (${RATING_EMOJIS[rating - 1]})?`
            );
            if (!confirmChange) return;
        }

        setIsSavingRating(true);
        try {
            await upsertRating({ bookId, date: selectedDate, rating });
            // No manual refresh needed - Convex reactive queries auto-update
        } catch (err) {
            console.error('Failed to save rating:', err);
        } finally {
            setIsSavingRating(false);
        }
    };

    const getDayData = (day: number) => {
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return monthData?.find(d => d.date === dateStr);
    };

    const hasReadingForFilter = (dayData: MonthDayData | undefined) => {
        if (!dayData) return false;
        if (!selectedBookId) return dayData.readings.length > 0 || dayData.hasJournal;
        return dayData.readings.some((r) => r.bookId === selectedBookId);
    };

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

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    const isLoading = history === undefined;

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-[#F9F9FA] flex flex-col animate-fade-in">
            {/* Top Navigation / Close Bar (Mobile/Tablet) */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-china/10">
                <h2 className="text-lg font-bold text-midnight">History</h2>
                <button onClick={onClose} className="p-2 bg-porcelain rounded-full">
                    <svg className="w-6 h-6 text-midnight" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left: Calendar Sidebar */}
                <div className="w-full md:w-[400px] xl:w-[450px] bg-white border-r border-china/5 p-6 md:p-8 flex flex-col z-10 overflow-y-auto">
                    <div className="hidden md:block mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <button onClick={onClose} className="p-2 -ml-2 hover:bg-porcelain rounded-lg transition-colors group" title="Close History">
                                <svg className="w-6 h-6 text-china group-hover:text-midnight" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h2 className="text-3xl font-bold text-midnight tracking-tight">History</h2>
                                <p className="text-china text-sm">Review your journey</p>
                            </div>
                        </div>

                        {/* Book Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
                            <button
                                onClick={() => setSelectedBookId(null)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedBookId === null
                                    ? 'bg-midnight text-white border-midnight'
                                    : 'bg-white text-china border-china/20 hover:border-china/50'
                                    }`}
                            >
                                All
                            </button>
                            {dailyBooks.map(book => (
                                <button
                                    key={book.id}
                                    onClick={() => setSelectedBookId(book.id)}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border gap-2 flex items-center transition-all ${selectedBookId === book.id
                                        ? 'bg-midnight text-white border-midnight'
                                        : 'bg-white text-china border-china/20 hover:border-china/50'
                                        }`}
                                >
                                    <span>{book.icon}</span>
                                    <span>{book.shortTitle}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Month Nav */}
                    <div className="flex items-center justify-between mb-8 bg-porcelain/30 p-2 rounded-2xl">
                        <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-white shadow-sm rounded-xl transition-all">
                            <svg className="w-5 h-5 text-midnight" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-lg font-bold text-midnight">
                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-3 hover:bg-white shadow-sm rounded-xl transition-all">
                            <svg className="w-5 h-5 text-midnight" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="flex-1 min-h-[300px]">
                        <div className="grid grid-cols-7 mb-4">
                            {WEEKDAYS.map(day => (
                                <div key={day} className="text-center text-xs font-bold text-china/40 py-2">{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                            {Array.from({ length: days }).map((_, i) => {
                                const day = i + 1;
                                const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isSelected = selectedDate === dateStr;
                                const dayData = getDayData(day);
                                const hasActivity = hasReadingForFilter(dayData);

                                const dayReadings = dayData?.readings?.filter(r => r.rating) || [];
                                const specificRating = selectedBookId ? dayReadings.find(r => r.bookId === selectedBookId)?.rating : null;
                                const emoji = specificRating ? RATING_EMOJIS[specificRating - 1] : null;
                                const showEmojis = !selectedBookId && dayReadings.length > 0;

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDate(dateStr)}
                                        className={`aspect-square rounded-xl text-base flex flex-col items-center justify-center transition-all relative ${isSelected
                                            ? 'bg-royal text-white font-bold shadow-lg shadow-royal/20 scale-105'
                                            : hasActivity
                                                ? 'bg-white border-2 border-royal/10 text-midnight font-bold hover:border-royal/30'
                                                : 'text-china/60 font-medium hover:bg-porcelain'
                                            }`}
                                    >
                                        <span className={(emoji || showEmojis) ? 'text-[10px] mb-0.5 opacity-60' : ''}>{day}</span>

                                        {!isSelected && (
                                            emoji ? (
                                                <span className="text-lg leading-none -mt-1">{emoji}</span>
                                            ) : showEmojis ? (
                                                <div className="absolute bottom-1 flex items-center justify-center gap-[1px] max-w-full overflow-hidden px-0.5">
                                                    {dayReadings.slice(0, 4).map((r, idx) => (
                                                        <span key={idx} className="text-[10px] leading-none">{RATING_EMOJIS[r.rating - 1]}</span>
                                                    ))}
                                                    {dayReadings.length > 4 && <span className="text-[8px] leading-none text-midnight">+</span>}
                                                </div>
                                            ) : hasActivity ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-royal absolute bottom-2" />
                                            ) : null
                                        )}

                                        {isSelected && (
                                            emoji ? (
                                                <span className="text-lg leading-none absolute bottom-1">{emoji}</span>
                                            ) : showEmojis ? (
                                                <div className="absolute bottom-1 flex items-center justify-center gap-[1px]">
                                                    {dayReadings.slice(0, 3).map((r, idx) => (
                                                        <span key={idx} className="text-[10px] leading-none">{RATING_EMOJIS[r.rating - 1]}</span>
                                                    ))}
                                                </div>
                                            ) : null
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Details Content */}
                <div className="flex-1 bg-porcelain/30 relative flex flex-col h-full overflow-hidden">
                    {/* Desktop Close Button (Floating) */}
                    <button onClick={onClose} className="hidden md:flex absolute top-8 right-8 z-20 p-3 bg-white/80 hover:bg-white backdrop-blur-sm shadow-sm hover:shadow-md rounded-2xl transition-all group items-center gap-2">
                        <span className="text-xs font-bold text-china group-hover:text-midnight">ESC</span>
                        <svg className="w-5 h-5 text-midnight" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="flex-1 overflow-y-auto p-8 md:p-12 xl:p-16">
                        <div className="max-w-4xl mx-auto pb-20">
                            {/* Header */}
                            <div className="mb-12">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-china/10 text-xs font-bold text-china uppercase tracking-wider mb-4 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-royal"></span>
                                    {selectedBookId ? dailyBooks.find(b => b.id === selectedBookId)?.shortTitle : 'Daily Overview'}
                                </div>
                                <h3 className="text-4xl md:text-5xl font-bold text-midnight tracking-tight">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h3>
                            </div>

                            {isLoading ? (
                                <div className="flex justify-center py-20">
                                    <div className="w-12 h-12 rounded-full border-4 border-royal/20 border-t-royal animate-spin" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {/* Journal Section */}
                                    <section className="xl:col-span-2">
                                        <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-china/5 min-h-[300px]">
                                            <h4 className="flex items-center gap-3 text-lg font-bold text-midnight mb-6">
                                                <div className="p-2 rounded-xl bg-orange-50 text-orange-500">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </div>
                                                Journal Entry
                                            </h4>
                                            {history?.journal ? (
                                                <div className="prose prose-lg prose-p:text-midnight/80 max-w-none">
                                                    <p className="whitespace-pre-wrap font-serif leading-relaxed">
                                                        {history?.journal}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="h-40 flex flex-col items-center justify-center text-china/40 border-2 border-dashed border-porcelain rounded-2xl">
                                                    <p className="text-base font-medium">No journal entry for this day</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Readings Section */}
                                    <section className="xl:col-span-2">
                                        <h4 className="flex items-center gap-3 text-lg font-bold text-midnight mb-6">
                                            <div className="p-2 rounded-xl bg-royal/5 text-royal">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                            </div>
                                            Readings Completed
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {dailyBooks.map(book => {
                                                const rating = history?.readings?.find(r => r.bookId === book.id)?.rating;
                                                return (
                                                    <button
                                                        key={book.id}
                                                        onClick={() => {
                                                            const d = new Date(selectedDate);
                                                            const startD = new Date(d.getFullYear(), 0, 0);
                                                            const doy = Math.floor((d.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
                                                            handleBookClick(book, doy);
                                                        }}
                                                        className={`w-full p-4 rounded-2xl border transition-all text-left group ${rating ? 'bg-white border-china/10 shadow-sm hover:shadow-md hover:border-royal/20' : 'bg-porcelain/40 border-transparent opacity-50 hover:opacity-100 hover:bg-white hover:border-china/20'
                                                            }`}>
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="w-10 h-10 rounded-xl bg-porcelain flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                                                                {book.icon}
                                                            </div>
                                                            {rating && (
                                                                <div className="text-2xl animate-bounce-subtle" title={`Rated: ${rating}/5`}>
                                                                    {['😔', '😐', '🙂', '😊', '🤩'][rating - 1]}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-midnight mb-0.5 group-hover:text-royal transition-colors">{book.shortTitle}</p>
                                                            <p className="text-xs text-china">{book.author}</p>
                                                            {!rating && <p className="text-[10px] text-royal font-bold mt-2 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">Read & Rate</p>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reading Modal for History */}
            {selectedReadBook && (
                <ReadingModal
                    book={selectedReadBook}
                    dayOfYear={readingDayOfYear}
                    dateLabel={new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    content={readingContent}
                    isLoading={isLoadingContent}
                    error={contentError}
                    onClose={() => {
                        setSelectedReadBook(null);
                        setReadingContent(null);
                    }}
                    currentRating={history?.readings?.find(r => r.bookId === selectedReadBook.id)?.rating || null}
                    streak={0}
                    onRate={(rating) => handleRating(selectedReadBook.id, rating)}
                    isSavingRating={isSavingRating}
                />
            )}
        </div>,
        document.body
    );
}
