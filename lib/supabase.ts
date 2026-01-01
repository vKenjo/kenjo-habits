import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a dummy client or real client based on env vars
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    // Create a placeholder - will show error in UI when used
    supabase = null as unknown as SupabaseClient;
}

export { supabase };
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Type definitions for our database tables
export interface Habit {
    id: string;
    name: string;
    created_at: string;
    sort_order: number;
}

export interface HabitCompletion {
    id: string;
    habit_id: string;
    completed_date: string;
    created_at: string;
}

export interface ReadingRating {
    id: string;
    book_id: string;
    reading_date: string;
    rating: number;
    created_at: string;
    updated_at: string;
}
