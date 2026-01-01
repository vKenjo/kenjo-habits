import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // Format: YYYY-MM-DD

    if (!date) {
        return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('daily_journals')
            .select('content')
            .eq('date', date)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return NextResponse.json({ content: data?.content || '' });
    } catch (error) {
        console.error('Error fetching journal:', error);
        return NextResponse.json({ error: 'Failed to fetch journal' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { date, content } = body;

        if (!date) {
            return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
        }

        const { error } = await supabase
            .from('daily_journals')
            .upsert({
                date,
                content: content || '',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'date'
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving journal:', error);
        return NextResponse.json({ error: 'Failed to save journal' }, { status: 500 });
    }
}
