'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

import { dailyBooks, getDayOfYear, formatDateForReading, DailyBook } from '@/lib/dailyBooks';
import ReadingModal, { ReadingContent } from './ReadingModal';

// Helper to get month name, day, and formatted date from day of year
function getDateFromDayOfYear(dayOfYear: number): { monthName: string; dayOfMonth: number; dateString: string } {
    const date = new Date(new Date().getFullYear(), 0, dayOfYear);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

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
    const [isExpanded] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedBook, setSelectedBook] = useState<DailyBook | null>(null);
    const [readingContent, setReadingContent] = useState<ReadingContent | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSavingRating, setIsSavingRating] = useState(false);

    const bookIds = useMemo(() => dailyBooks.map((b) => b.id), []);
    const dateString = useMemo(() => getDateFromDayOfYear(dayOfYear).dateString, [dayOfYear]);

    // Single reactive query for all book streaks
    const streakData = useQuery(api.readingRatings.getAllStreaks, {
        bookIds,
        date: dateString,
    });

    const upsertRating = useMutation(api.readingRatings.upsert);

    useEffect(() => {
        const now = new Date();
        const day = getDayOfYear(now);
        setDayOfYear(day);
        setDisplayDateString(formatDateForReading(now));
        setIsLoaded(true);
    }, []);

    const fetchContent = useCallback(async (book: DailyBook) => {
        setIsLoadingContent(true);
        setError(null);
        try {
            const cacheBuster = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/reading?bookId=${book.id}&day=${dayOfYear}&_=${cacheBuster}`, {
                cache: 'no-cache'
            });
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
        setIsSavingRating(true);
        try {
            await upsertRating({ bookId, date: dateString, rating });
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
                                streak={streakData?.[book.id]?.streak || 0}
                                isCompleted={!!streakData?.[book.id]?.rating}
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
                    currentRating={streakData?.[selectedBook.id]?.rating || null}
                    streak={streakData?.[selectedBook.id]?.streak || 0}
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
                                    {'\uD83D\uDD25'} {streak}
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
