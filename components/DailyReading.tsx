'use client';

import { useState, useEffect, useCallback } from 'react';
import { dailyBooks, getDayOfYear, formatDateForReading, DailyBook } from '@/lib/dailyBooks';

interface ReadingContent {
    bookId: string;
    title: string;
    author: string;
    day: number;
    content: string;
    monthIntro?: string;
    monthTheme?: string;
}

interface StreakData {
    rating: number | null;
    streak: number;
    totalDays: number;
}

// Emoji ratings for the 1-5 scale
const RATING_EMOJIS = ['😔', '😐', '🙂', '😊', '🤩'];
const RATING_LABELS = ['Not great', 'Okay', 'Good', 'Great', 'Amazing'];

// Helper to get month name, day, and formatted date from day of year
function getDateFromDayOfYear(dayOfYear: number): { monthName: string; dayOfMonth: number; dateString: string } {
    const date = new Date(new Date().getFullYear(), 0, dayOfYear);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dateString = date.toISOString().split('T')[0];
    return {
        monthName: monthNames[date.getMonth()],
        dayOfMonth: date.getDate(),
        dateString
    };
}

import HistoryModal from './HistoryModal';

export default function DailyReading() {
    const [dayOfYear, setDayOfYear] = useState<number>(1);
    const [displayDateString, setDisplayDateString] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedBook, setSelectedBook] = useState<DailyBook | null>(null);
    const [readingContent, setReadingContent] = useState<ReadingContent | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [streakData, setStreakData] = useState<Record<string, StreakData>>({});
    const [isSavingRating, setIsSavingRating] = useState(false);

    // Fetch streak data for all books on load
    const fetchAllStreaks = useCallback(async (day: number) => {
        const { dateString } = getDateFromDayOfYear(day);
        const newStreakData: Record<string, StreakData> = {};

        await Promise.all(dailyBooks.map(async (book) => {
            try {
                const response = await fetch(`/api/ratings?bookId=${book.id}&date=${dateString}&streak=true`);
                if (response.ok) {
                    const data = await response.json();
                    newStreakData[book.id] = {
                        rating: data.rating,
                        streak: data.streak || 0,
                        totalDays: data.totalDays || 0
                    };
                }
            } catch (err) {
                console.error(`Failed to fetch streak for ${book.id}:`, err);
            }
        }));

        setStreakData(newStreakData);
    }, []);

    useEffect(() => {
        const now = new Date();
        const day = getDayOfYear(now);
        setDayOfYear(day);
        setDisplayDateString(formatDateForReading(now));
        setIsLoaded(true);
        fetchAllStreaks(day);
    }, [fetchAllStreaks]);

    const fetchContent = useCallback(async (book: DailyBook) => {
        setIsLoadingContent(true);
        setError(null);
        try {
            const response = await fetch(`/api/reading?bookId=${book.id}&day=${dayOfYear}`);
            if (!response.ok) throw new Error('Failed to fetch content');
            const data = await response.json();
            setReadingContent(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoadingContent(false);
        }
    }, [dayOfYear]);

    const handleBookClick = (book: DailyBook) => {
        setSelectedBook(book);
        fetchContent(book);
    };

    const closeModal = () => {
        setSelectedBook(null);
        setReadingContent(null);
        setError(null);
    };

    const handleRating = async (bookId: string, rating: number) => {
        const { dateString } = getDateFromDayOfYear(dayOfYear);

        // Optimistically update UI
        setStreakData(prev => ({
            ...prev,
            [bookId]: {
                ...prev[bookId],
                rating,
                streak: (prev[bookId]?.streak || 0) + (prev[bookId]?.rating ? 0 : 1)
            }
        }));
        setIsSavingRating(true);

        try {
            const response = await fetch('/api/ratings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, date: dateString, rating })
            });

            if (response.ok) {
                const data = await response.json();
                setStreakData(prev => ({
                    ...prev,
                    [bookId]: {
                        rating: data.rating,
                        streak: data.streak,
                        totalDays: data.totalDays
                    }
                }));
            }
        } catch (err) {
            console.error('Failed to save rating:', err);
        } finally {
            setIsSavingRating(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-china/10 animate-pulse">
                <div className="h-5 bg-porcelain rounded w-1/2 mb-3" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-24 bg-porcelain rounded-xl" />
                    <div className="h-24 bg-porcelain rounded-xl" />
                </div>
            </div>
        );
    }

    const { monthName, dayOfMonth } = getDateFromDayOfYear(dayOfYear);

    return (
        <>
            <div className="bg-transparent p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-royal/10 to-china/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-midnight">Daily Reading</h2>
                            <p className="text-xs text-china">{displayDateString}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowHistory(true)}
                        className="p-2 rounded-lg hover:bg-porcelain/50 transition-colors text-china hover:text-midnight flex items-center gap-1.5"
                        aria-label="View History"
                    >
                        <span className="text-xs font-semibold">History</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>

                {/* Book Rows */}
                {isExpanded && (
                    <div className="flex flex-col gap-1 animate-fade-in mt-1">
                        {dailyBooks.map((book: DailyBook) => (
                            <BookCard
                                key={book.id}
                                book={book}
                                dateLabel={`${monthName} ${dayOfMonth}`}
                                streak={streakData[book.id]?.streak || 0}
                                isCompleted={!!streakData[book.id]?.rating}
                                onClick={() => handleBookClick(book)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Reading Modal */}
            {selectedBook && (
                <ReadingModal
                    book={selectedBook}
                    dayOfYear={dayOfYear}
                    dateLabel={`${monthName} ${dayOfMonth}`}
                    content={readingContent}
                    isLoading={isLoadingContent}
                    error={error}
                    onClose={closeModal}
                    currentRating={streakData[selectedBook.id]?.rating || null}
                    streak={streakData[selectedBook.id]?.streak || 0}
                    onRate={(rating) => handleRating(selectedBook.id, rating)}
                    isSavingRating={isSavingRating}
                />
            )}

            {/* History Modal */}
            {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
        </>
    );
}

function BookCard({
    book,
    streak,
    isCompleted,
    onClick
}: {
    book: DailyBook;
    dateLabel: string;
    streak: number;
    isCompleted: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="group flex items-center justify-between w-full p-3 rounded-2xl hover:bg-white/40 transition-all duration-300 cursor-pointer text-left border border-transparent hover:border-white/40 hover:shadow-sm"
        >
            {/* Left: Icon & Info */}
            <div className="flex items-center gap-4 overflow-hidden">
                <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-sm ${isCompleted
                    ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600'
                    : 'bg-white text-midnight group-hover:scale-105'
                    }`}>
                    <span className="text-xl" role="img" aria-label={book.title}>
                        {book.icon}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-bold truncate transition-colors ${isCompleted ? 'text-china/60' : 'text-midnight group-hover:text-royal'
                        }`}>
                        {book.shortTitle}
                    </h3>
                    <div className="flex items-center gap-3">
                        <p className="text-[11px] font-medium text-china/50 uppercase tracking-widest">{book.author}</p>
                        {streak > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-china/20" />
                                <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                                    🔥 {streak}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Action */}
            <div className="flex-shrink-0 ml-3">
                {isCompleted ? (
                    <div className="group/check w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-110">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-china/10 group-hover:border-royal/30 group-hover:bg-white flex items-center justify-center transition-all">
                        <svg className="w-4 h-4 text-royal opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
            </div>
        </button>
    );
}

function ReadingModal({
    book,
    dayOfYear,
    dateLabel,
    content,
    isLoading,
    error,
    onClose,
    currentRating,
    streak,
    onRate,
    isSavingRating
}: {
    book: DailyBook;
    dayOfYear: number;
    dateLabel: string;
    content: ReadingContent | null;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
    currentRating: number | null;
    streak: number;
    onRate: (rating: number) => void;
    isSavingRating: boolean;
}) {
    const [showMonthOverview, setShowMonthOverview] = useState(false);

    const date = new Date(new Date().getFullYear(), 0, dayOfYear);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[date.getMonth()];

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    useEffect(() => {
        setShowMonthOverview(false);
    }, [content]);

    const hasMonthIntro = content?.monthIntro && book.id === 'daily-laws';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-midnight/50 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-slide-up">
                {/* Header */}
                <div className={`sticky top-0 bg-gradient-to-br ${book.color} px-5 py-4 border-b border-china/10`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl" role="img" aria-label={book.title}>
                                {book.icon}
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-midnight">{book.title}</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-sm text-china">{book.author} · {dateLabel}</p>
                                    {streak > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-400 to-amber-400 text-white streak-badge">
                                            🔥 {streak} day{streak !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5 text-china" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
                    {hasMonthIntro && !isLoading && (
                        <div className="mb-5 flex gap-2 p-1 bg-porcelain/50 rounded-xl w-fit">
                            <button
                                onClick={() => setShowMonthOverview(false)}
                                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${!showMonthOverview
                                    ? 'bg-white text-midnight shadow-sm'
                                    : 'text-china hover:text-midnight'
                                    }`}
                            >
                                📖 Today&apos;s Reading
                            </button>
                            <button
                                onClick={() => setShowMonthOverview(true)}
                                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${showMonthOverview
                                    ? 'bg-white text-midnight shadow-sm'
                                    : 'text-china hover:text-midnight'
                                    }`}
                            >
                                📚 {monthName} Overview
                            </button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-10 h-10 border-3 border-royal/30 border-t-royal rounded-full animate-spin" />
                            <p className="mt-4 text-sm text-china">Loading today&apos;s reading...</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-16">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-sm text-china">{error}</p>
                        </div>
                    )}

                    {content && !isLoading && !error && (
                        <>
                            <div
                                className="reading-content prose prose-sm max-w-none prose-headings:text-midnight prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3 prose-p:text-midnight/85 prose-p:leading-relaxed prose-p:mb-4 prose-blockquote:border-l-4 prose-blockquote:border-royal/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-china prose-strong:text-royal prose-strong:font-semibold"
                                dangerouslySetInnerHTML={{
                                    __html: showMonthOverview && content.monthIntro
                                        ? content.monthIntro
                                        : content.content
                                }}
                            />

                            {/* Rating Section */}
                            <div className="mt-10 pt-6 border-t-2 border-dashed border-china/20 rounded-xl">
                                <div className="text-center mb-4">
                                    <p className="text-sm font-semibold text-midnight">
                                        How did this reading resonate with you?
                                    </p>
                                    {isSavingRating && (
                                        <p className="text-xs text-china mt-1 animate-pulse">Saving...</p>
                                    )}
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    {RATING_EMOJIS.map((emoji, index) => {
                                        const rating = index + 1;
                                        const isSelected = currentRating === rating;
                                        return (
                                            <button
                                                key={rating}
                                                onClick={() => onRate(rating)}
                                                disabled={isSavingRating}
                                                className={`group relative p-3 rounded-xl transition-all ${isSelected
                                                    ? 'bg-gradient-to-br from-royal/15 to-china/10 ring-2 ring-royal/40 scale-110'
                                                    : 'hover:bg-porcelain hover:scale-105'
                                                    } ${isSavingRating ? 'opacity-50' : ''}`}
                                                title={RATING_LABELS[index]}
                                            >
                                                <span className={`text-3xl block transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                    {emoji}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {currentRating && (
                                    <p className="mt-3 text-xs text-china text-center font-medium">
                                        You rated this: <span className="text-royal">{RATING_LABELS[currentRating - 1]}</span>
                                    </p>
                                )}
                            </div>

                            <div className="h-8" />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
