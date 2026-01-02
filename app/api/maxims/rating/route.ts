import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const maximNumber = searchParams.get('maximNumber');
    // const userId = searchParams.get('userId'); // Optional: if we want to support specific users later

    if (!maximNumber) {
        return NextResponse.json({ error: 'Missing maximNumber parameter' }, { status: 400 });
    }

    try {
        // Try to find rating for this maxim
        // Logic: prioritize authenticated user if any, otherwise fall back to null user_id
        // For this app, we mostly likely just have null user_id (local mode) OR specific user_id

        // Since we enabled "Public handling" in RLS for null user_id, we can just query.
        // If we want to support the "current user or system default", we can try to fetch both and pick one,
        // but for now let's just fetch the one that matches our constraints.
        // Given the single-tenant nature reuse, we'll look for *any* rating for this maxim.
        // Or strictly: look for user_id is null if no auth, or matches auth if auth.

        // Simpler approach for this specific local-first app: 
        // Just get the rating where user_id is NULL (the default profile)

        const { data, error } = await supabase
            .from('maxim_ratings')
            .select('rating')
            .eq('maxim_number', maximNumber)
            .is('user_id', null)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({ rating: data?.rating || null });
    } catch (error) {
        console.error('Error fetching maxim rating:', error);
        return NextResponse.json({ error: 'Failed to fetch rating' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { maximNumber, rating } = body;

        if (!maximNumber || rating === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Handle deletion (toggle off) if rating is explicitly null (though frontend usually sends boolean)
        // If the frontend sends "null" to remove, we can handle it.
        // But the frontend currently sends boolean true/false.
        // If it sends the *same* value as current, we might want to delete? 
        // The frontend handles the toggle logic usually. 
        // Let's assume the frontend sends the DESIRED state (true/false).
        // If the frontend wants to remove it, it might send null? 
        // Checking `DailyQuote.tsx`: it handles toggle logic and calls delete() or upsert().
        // We should support DELETE method or handle it here?
        // Let's stick to upsert for true/false. If we need to delete, maybe use DELETE method or a specific flag.
        // Actually, `DailyQuote.tsx` logic:
        // if (rating === newRating) -> delete
        // else -> upsert

        // We will implement DELETE handling in this POST or a separate DELETE handler. 
        // Often cleaner to have a separate DELETE, but let's see current request body.
        // The frontend `handleRating` calls:
        // if delete: `rating === newRating` (locally), then it calls delete().
        // We need to support that.
        // Since we are replacing the frontend logic, let's make the API simple:
        // POST { maximNumber, rating: boolean | null }
        // if rating is null, delete.
        // if rating is boolean, upsert.

        if (rating === null) {
            const { error } = await supabase
                .from('maxim_ratings')
                .delete()
                .eq('maxim_number', maximNumber)
                .is('user_id', null);

            if (error) throw error;
            return NextResponse.json({ success: true, rating: null });
        } else {
            // Explicitly handle upsert for NULL user_id to avoid unique index conflict issues with standard upsert
            // First, look for existing record
            const { data: existing } = await supabase
                .from('maxim_ratings')
                .select('id')
                .eq('maxim_number', maximNumber)
                .is('user_id', null)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('maxim_ratings')
                    .update({
                        rating: rating,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('maxim_ratings')
                    .insert({
                        maxim_number: maximNumber,
                        rating: rating,
                        user_id: null,
                        updated_at: new Date().toISOString()
                    });
                if (error) throw error;
            }

            return NextResponse.json({ success: true, rating });
        }
    } catch (error) {
        console.error('Error saving maxim rating:', error);
        return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }
}
