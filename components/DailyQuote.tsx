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

// Add Supabase import
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function DailyQuote() {
    const [currentMaxim, setCurrentMaxim] = useState<Maxim | null>(null);
    const [refreshCount, setRefreshCount] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [rating, setRating] = useState<boolean | null>(null);
    const [isLoadingRating, setIsLoadingRating] = useState(false);

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

    // Fetch rating when currentMaxim changes
    useEffect(() => {
        if (!currentMaxim) return;

        const fetchRating = async () => {
            setIsLoadingRating(true);
            try {
                const response = await fetch(`/api/maxims/rating?maximNumber=${currentMaxim.number}`);
                if (response.ok) {
                    const data = await response.json();
                    setRating(data.rating);
                } else {
                    setRating(null);
                }
            } catch (error) {
                console.error('Error fetching rating:', error);
                setRating(null);
            } finally {
                setIsLoadingRating(false);
            }
        };

        fetchRating();
    }, [currentMaxim]);

    const handleRating = async (newRating: boolean) => {
        if (!currentMaxim) return;

        // Optimistic update
        const previousRating = rating;

        // If clicking the same rating, toggle it off (remove rating)
        // If clicking different, set to new
        let targetRating: boolean | null = newRating;
        if (rating === newRating) {
            targetRating = null;
        }

        setRating(targetRating);
        setIsLoadingRating(true); // Ideally shouldn't block UI but prevents double submission

        try {
            const response = await fetch('/api/maxims/rating', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    maximNumber: currentMaxim.number,
                    rating: targetRating
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save rating');
            }

            // If needed, we can update state from response, but optimistic is usually fine
        } catch (error) {
            console.error('Error saving rating:', error);
            setRating(previousRating); // Revert
        } finally {
            setIsLoadingRating(false);
        }
    };

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
        <div className="bg-transparent p-4">
            <div className="flex items-start gap-4">
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
                <div className="flex flex-col gap-1 items-center justify-center pl-2 border-l border-porcelain/50">
                    <button
                        onClick={() => handleRating(true)}
                        disabled={isLoadingRating}
                        className={`p-1.5 rounded-lg transition-all ${rating === true
                            ? 'bg-green-100 text-green-600'
                            : 'text-china/40 hover:text-green-500 hover:bg-green-50'
                            }`}
                        title="Like this quote"
                    >
                        <svg className="w-5 h-5" fill={rating === true ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                    </button>
                    <button
                        onClick={() => handleRating(false)}
                        disabled={isLoadingRating}
                        className={`p-1.5 rounded-lg transition-all ${rating === false
                            ? 'bg-red-100 text-red-600'
                            : 'text-china/40 hover:text-red-500 hover:bg-red-50'
                            }`}
                        title="Dislike this quote"
                    >
                        <svg className="w-5 h-5" fill={rating === false ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                        </svg>
                    </button>
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
        </div >
    );
}
