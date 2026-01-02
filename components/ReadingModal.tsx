'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DailyBook } from '@/lib/dailyBooks';

export interface ReadingContent {
    bookId: string;
    title: string;
    author: string;
    day: number;
    content: string;
    monthIntro?: string;
    monthTheme?: string;
}

// Emoji ratings for the 1-5 scale
const RATING_EMOJIS = ['😔', '😐', '🙂', '😊', '🤩'];
const RATING_LABELS = ['Not great', 'Okay', 'Good', 'Great', 'Amazing'];

export default function ReadingModal({
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
    const [mounted, setMounted] = useState(false);

    const date = new Date(new Date().getFullYear(), 0, dayOfYear);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[date.getMonth()];

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

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

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[101] bg-[#F9F9FA] flex flex-col animate-fade-in">
            {/* Header */}
            <div className={`bg-gradient-to-br ${book.color} px-4 py-4 sm:px-8 sm:py-6 shadow-sm z-10`}>
                <div className="max-w-3xl mx-auto w-full flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl sm:text-4xl shadow-sm bg-white/20 backdrop-blur-sm rounded-xl p-2" role="img" aria-label={book.title}>
                            {book.icon}
                        </span>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-midnight">{book.title}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm sm:text-base text-midnight/80 font-medium">{book.author} · {dateLabel}</p>
                                {streak > 0 && (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-white/30 text-midnight border border-white/20 backdrop-blur-sm">
                                        🔥 {streak} {streak !== 1 ? 'days' : 'day'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 sm:p-3 rounded-xl bg-white/20 hover:bg-white/40 transition-colors backdrop-blur-sm"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-midnight" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto bg-[#F2F2F2]">
                <div className="max-w-3xl mx-auto w-full p-4 sm:p-8 pb-20">
                    <div className="bg-[#faf9f6] rounded-3xl p-8 sm:p-12 shadow-xl shadow-china/5 border border-china/5 min-h-[60vh] relative overflow-hidden">
                        {/* Paper texture overlay (optional/simulated) */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }}></div>

                        <div className="relative z-10">
                            {hasMonthIntro && !isLoading && (
                                <div className="mb-8 flex gap-2 p-1 bg-porcelain rounded-xl w-fit mx-auto sm:mx-0">
                                    <button
                                        onClick={() => setShowMonthOverview(false)}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${!showMonthOverview
                                            ? 'bg-white text-midnight shadow-sm'
                                            : 'text-china hover:text-midnight'
                                            }`}
                                    >
                                        📖 Today&apos;s Reading
                                    </button>
                                    <button
                                        onClick={() => setShowMonthOverview(true)}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${showMonthOverview
                                            ? 'bg-white text-midnight shadow-sm'
                                            : 'text-china hover:text-midnight'
                                            }`}
                                    >
                                        📚 {monthName} Overview
                                    </button>
                                </div>
                            )}

                            {isLoading && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-12 h-12 border-4 border-royal/20 border-t-royal rounded-full animate-spin" />
                                    <p className="mt-6 text-sm font-medium text-china">Loading wisdom...</p>
                                </div>
                            )}

                            {error && (
                                <div className="text-center py-20">
                                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <p className="text-base text-china max-w-md mx-auto">{error}</p>
                                </div>
                            )}

                            {content && !isLoading && !error && (
                                <>
                                    <div
                                        className="reading-content
                                    prose prose-xl max-w-none 
                                    font-serif leading-loose
                                    text-midnight/90
                                    prose-headings:font-sans prose-headings:font-bold prose-headings:text-midnight prose-headings:text-center prose-headings:mb-8
                                    prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
                                    ${showMonthOverview ? 'prose-h1:text-5xl prose-h1:uppercase prose-h1:tracking-widest prose-h1:text-royal/80 prose-h1:mb-12 prose-h2:text-3xl prose-h2:text-midnight/80 prose-h2:mb-4' : ''}
                                    prose-p:mb-6 prose-p:leading-loose
                                    prose-blockquote:border-l-4 prose-blockquote:border-royal/40 prose-blockquote:bg-royal/5 prose-blockquote:py-6 prose-blockquote:px-8 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-midnight prose-blockquote:my-10 prose-blockquote:font-sans prose-blockquote:text-xl
                                    prose-strong:text-royal prose-strong:font-bold
                                    [&_.author-attribution]:text-right [&_.author-attribution]:text-base [&_.author-attribution]:font-sans [&_.author-attribution]:text-china [&_.author-attribution]:mt-4 [&_.author-attribution]:italic
                                    [&_.action-point]:bg-amber-50 [&_.action-point]:border [&_.action-point]:border-amber-200 [&_.action-point]:rounded-xl [&_.action-point]:p-6 [&_.action-point]:my-10 [&_.action-point]:text-amber-900 [&_.action-point]:shadow-sm
                                    [&_.action-point_strong]:text-amber-700 [&_.action-point_strong]:uppercase [&_.action-point_strong]:tracking-wider [&_.action-point_strong]:text-sm [&_.action-point_strong]:block [&_.action-point_strong]:mb-2"
                                        dangerouslySetInnerHTML={{
                                            __html: showMonthOverview && content.monthIntro
                                                ? content.monthIntro
                                                : content.content
                                        }}
                                    />

                                    {/* Rating Section */}
                                    {!showMonthOverview && (
                                        <div className="mt-12 pt-8 border-t border-dashed border-china/10">
                                            <div className="text-center mb-6">
                                                <p className="text-base font-bold text-midnight mb-2">
                                                    How did this reading resonate with you?
                                                </p>
                                                {isSavingRating && (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal/5 text-royal text-xs font-bold animate-pulse">
                                                        <div className="w-2 h-2 bg-royal rounded-full animate-bounce" />
                                                        Saving...
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-center gap-2 sm:gap-4">
                                                {RATING_EMOJIS.map((emoji, index) => {
                                                    const rating = index + 1;
                                                    const isSelected = currentRating === rating;
                                                    return (
                                                        <button
                                                            key={rating}
                                                            onClick={() => onRate(rating)}
                                                            disabled={isSavingRating}
                                                            className={`group relative p-4 rounded-2xl transition-all duration-300 ${isSelected
                                                                ? 'bg-royal text-white shadow-lg shadow-royal/30 scale-110 ring-4 ring-royal/20'
                                                                : 'bg-porcelain/50 hover:bg-white hover:shadow-md hover:scale-105'
                                                                } ${isSavingRating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            title={RATING_LABELS[index]}
                                                        >
                                                            <span className={`text-4xl block transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                                {emoji}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {currentRating && (
                                                <p className="mt-6 text-sm text-china text-center font-medium animate-fade-in">
                                                    You rated this: <span className="text-royal font-bold bg-royal/5 px-2 py-0.5 rounded-lg">{RATING_LABELS[currentRating - 1]}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
