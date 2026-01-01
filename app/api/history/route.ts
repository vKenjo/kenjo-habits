import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // Format: YYYY-MM-DD

    if (!date) {
        return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    try {
        // Fetch Reading Ratings
        const { data: ratings, error: ratingsError } = await supabase
            .from('reading_ratings')
            .select('book_id, rating')
            .eq('reading_date', date);

        if (ratingsError) throw ratingsError;

        // Fetch Journal
        const { data: journal, error: journalError } = await supabase
            .from('daily_journals')
            .select('content')
            .eq('date', date)
            .single();

        if (journalError && journalError.code !== 'PGRST116') {
            throw journalError;
        }

        return NextResponse.json({
            date,
            journal: journal?.content || '',
            readings: ratings || []
        });
    } catch (error) {
        console.error('Error fetching history:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
