'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export default function DailyJournal() {
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const todayDate = getTodayDateString();
    const journalData = useQuery(api.dailyJournals.getByDate, { date: todayDate });
    const upsertJournal = useMutation(api.dailyJournals.upsert);

    // Initialize content from Convex query
    useEffect(() => {
        if (journalData && !isInitialized) {
            if (journalData.content) {
                setContent(journalData.content);
            }
            setIsInitialized(true);
        }
    }, [journalData, isInitialized]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    // Save on change with debounce
    useEffect(() => {
        if (!isInitialized) return;
        const timeoutId = setTimeout(() => {
            if (content) {
                setIsSaving(true);
                upsertJournal({ date: todayDate, content })
                    .then(() => {
                        setTimeout(() => setIsSaving(false), 1000);
                    })
                    .catch(err => console.error('Failed to save journal:', err));
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [content, todayDate, upsertJournal, isInitialized]);

    return (
        <div className="bg-transparent p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-royal/5 flex items-center justify-center text-royal shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <span className="text-base font-bold text-midnight tracking-tight">Daily Journal</span>
                </div>
                {isSaving && (
                    <span className="text-xs text-emerald-500 font-medium animate-fade-in">Saved</span>
                )}
            </div>

            <div className="relative group">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What are your key takeaways for today?"
                    className="w-full min-h-[120px] bg-white/40 hover:bg-white/60 focus:bg-white/80 border border-china/10 focus:border-royal/30 rounded-xl p-4 text-sm text-midnight placeholder:text-china/40 resize-none outline-none transition-all duration-200 leading-relaxed"
                />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <svg className="w-4 h-4 text-china/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
