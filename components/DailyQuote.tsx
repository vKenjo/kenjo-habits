'use client';

import { useState, useEffect, useCallback } from 'react';
import { maxims, Maxim } from '@/lib/maxims';

const MAX_REFRESHES_PER_DAY = 3;
const STORAGE_KEY = 'kenjo_habits_quote';

interface QuoteState {
    quoteIndex: number;
    refreshCount: number;
    date: string;
}

export default function DailyQuote() {
    const [currentMaxim, setCurrentMaxim] = useState<Maxim | null>(null);
    const [refreshCount, setRefreshCount] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    const getTodayString = () => {
        return new Date().toISOString().split('T')[0];
    };

    const getRandomIndex = useCallback(() => {
        return Math.floor(Math.random() * maxims.length);
    }, []);

    // Load saved state from localStorage
    useEffect(() => {
        const today = getTodayString();
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (savedData) {
            try {
                const parsed: QuoteState = JSON.parse(savedData);
                if (parsed.date === today) {
                    // Same day - use saved quote and count
                    setCurrentMaxim(maxims[parsed.quoteIndex]);
                    setRefreshCount(parsed.refreshCount);
                } else {
                    // New day - reset
                    const newIndex = getRandomIndex();
                    setCurrentMaxim(maxims[newIndex]);
                    setRefreshCount(0);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({
                        quoteIndex: newIndex,
                        refreshCount: 0,
                        date: today
                    }));
                }
            } catch {
                // Invalid data - reset
                const newIndex = getRandomIndex();
                setCurrentMaxim(maxims[newIndex]);
                setRefreshCount(0);
            }
        } else {
            // No saved data - initialize
            const newIndex = getRandomIndex();
            setCurrentMaxim(maxims[newIndex]);
            setRefreshCount(0);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                quoteIndex: newIndex,
                refreshCount: 0,
                date: today
            }));
        }
        setIsLoaded(true);
    }, [getRandomIndex]);

    const handleRefresh = () => {
        if (refreshCount >= MAX_REFRESHES_PER_DAY) return;

        const newIndex = getRandomIndex();
        const newCount = refreshCount + 1;

        setCurrentMaxim(maxims[newIndex]);
        setRefreshCount(newCount);

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            quoteIndex: newIndex,
            refreshCount: newCount,
            date: getTodayString()
        }));
    };

    const remainingRefreshes = MAX_REFRESHES_PER_DAY - refreshCount;

    if (!isLoaded || !currentMaxim) {
        return (
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-china/10 animate-pulse">
                <div className="h-4 bg-porcelain rounded w-3/4 mb-2" />
                <div className="h-4 bg-porcelain rounded w-1/2" />
            </div>
        );
    }

    return (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-china/10 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base text-midnight leading-relaxed italic">
                        &quot;{currentMaxim.text}&quot;
                    </p>
                    <p className="text-xs text-china mt-2">
                        — La Rochefoucauld, <span className="font-medium">Maxim #{currentMaxim.number}</span>
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-porcelain/50">
                <span className="text-xs text-china/70">
                    {remainingRefreshes > 0
                        ? `${remainingRefreshes} refresh${remainingRefreshes !== 1 ? 'es' : ''} left today`
                        : 'No more refreshes today'}
                </span>
                <button
                    onClick={handleRefresh}
                    disabled={remainingRefreshes === 0}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${remainingRefreshes > 0
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95'
                            : 'bg-porcelain text-china/50 cursor-not-allowed'
                        }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    New Quote
                </button>
            </div>
        </div>
    );
}
