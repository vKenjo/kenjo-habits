import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Calculate streak from an array of dates (descending order)
function calculateStreak(dates: string[]): number {
    if (dates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort dates descending (most recent first)
    const sortedDates = dates
        .map(d => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    let expectedDate = today;

    for (const date of sortedDates) {
        date.setHours(0, 0, 0, 0);

        // If this date matches the expected date, increment streak
        if (date.getTime() === expectedDate.getTime()) {
            streak++;
            // Next expected date is one day before
            expectedDate = new Date(expectedDate);
            expectedDate.setDate(expectedDate.getDate() - 1);
        } else if (date.getTime() < expectedDate.getTime()) {
            // If date is earlier than expected, streak is broken
            // But check if yesterday was the start (allow today gap)
            if (streak === 0 && date.getTime() === expectedDate.getTime() - 86400000) {
                streak = 1;
                expectedDate = new Date(date);
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    return streak;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const date = searchParams.get('date'); // Format: YYYY-MM-DD
    const includeStreak = searchParams.get('streak') === 'true';

    if (!bookId) {
        return NextResponse.json({ error: 'Missing bookId parameter' }, { status: 400 });
    }

    try {
        // If getting streak, fetch all ratings for this book
        if (includeStreak) {
            const { data: allRatings, error: allError } = await supabase
                .from('reading_ratings')
                .select('reading_date, rating')
                .eq('book_id', bookId)
                .order('reading_date', { ascending: false });

            if (allError) throw allError;

            const dates = allRatings?.map(r => r.reading_date) || [];
            const streak = calculateStreak(dates);

            // Get today's rating if date provided
            let todayRating = null;
            if (date) {
                const todayData = allRatings?.find(r => r.reading_date === date);
                todayRating = todayData?.rating || null;
            }

            return NextResponse.json({
                rating: todayRating,
                streak,
                totalDays: dates.length
            });
        }

        // Simple rating lookup for a specific date
        if (!date) {
            return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('reading_ratings')
            .select('rating')
            .eq('book_id', bookId)
            .eq('reading_date', date)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return NextResponse.json({ rating: data?.rating || null });
    } catch (error) {
        console.error('Error fetching rating:', error);
        return NextResponse.json({ error: 'Failed to fetch rating' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { bookId, date, rating } = body;

        if (!bookId || !date || !rating) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
        }

        // Guard Rail: Prevent future dates
        const submissionDate = new Date(date);
        const today = new Date();
        // Reset time part to compare dates only
        submissionDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (submissionDate > today) {
            return NextResponse.json({ error: 'Cannot rate for future dates' }, { status: 400 });
        }

        // Upsert the rating
        const { error } = await supabase
            .from('reading_ratings')
            .upsert({
                book_id: bookId,
                reading_date: date,
                rating: rating,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'book_id,reading_date'
            });

        if (error) throw error;

        // Fetch updated streak
        const { data: allRatings } = await supabase
            .from('reading_ratings')
            .select('reading_date')
            .eq('book_id', bookId)
            .order('reading_date', { ascending: false });

        const dates = allRatings?.map(r => r.reading_date) || [];
        const streak = calculateStreak(dates);

        return NextResponse.json({ success: true, rating, streak, totalDays: dates.length });
    } catch (error) {
        console.error('Error saving rating:', error);
        return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }
}
