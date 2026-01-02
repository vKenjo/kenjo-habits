import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // Format: YYYY-MM

    if (!month) {
        return NextResponse.json({ error: 'Missing month parameter' }, { status: 400 });
    }

    try {
        const [y, m] = month.split('-').map(Number);
        // Validating month format briefly
        if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
            return NextResponse.json({ error: 'Invalid month parameter' }, { status: 400 });
        }

        const start = `${month}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const end = `${month}-${lastDay}`;

        // Run queries in parallel
        const [ratingsRes, journalRes] = await Promise.all([
            supabase
                .from('reading_ratings')
                .select('reading_date, book_id, rating')
                .gte('reading_date', start)
                .lte('reading_date', end),
            supabase
                .from('daily_journals')
                .select('date') // only need existence
                .gte('date', start)
                .lte('date', end)
        ]);

        if (ratingsRes.error) throw ratingsRes.error;
        if (journalRes.error) throw journalRes.error;

        // Aggregate Data
        const dayMap: Record<string, { date: string; hasJournal: boolean; readings: { bookId: string; rating: number }[] }> = {};

        // Process Ratings
        ratingsRes.data?.forEach((r: any) => {
            const d = r.reading_date;
            if (!dayMap[d]) {
                dayMap[d] = { date: d, hasJournal: false, readings: [] };
            }
            dayMap[d].readings.push({ bookId: r.book_id, rating: r.rating });
        });

        // Process Journals
        journalRes.data?.forEach((j: any) => {
            const d = j.date;
            if (!dayMap[d]) {
                dayMap[d] = { date: d, hasJournal: false, readings: [] };
            }
            dayMap[d].hasJournal = true;
        });

        const results = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json(results);

    } catch (error) {
        console.error('Error fetching monthly history:', error);
        return NextResponse.json({ error: 'Failed to fetch monthly history' }, { status: 500 });
    }
}
