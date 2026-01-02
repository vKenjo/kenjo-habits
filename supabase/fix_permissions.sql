-- ============================================================================
-- FIX SCRIPT v2: Run this entire script in your Supabase SQL Editor.
-- This version ensures columns exist BEFORE applying policies.
-- ============================================================================

BEGIN;

-- 1. ENSURE COLUMNS EXIST
-- We must do this *before* creating policies that reference user_id.

ALTER TABLE habits ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
ALTER TABLE habit_completions ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
ALTER TABLE reading_ratings ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- Make them nullable for local use
ALTER TABLE habits ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE habit_completions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE reading_ratings ALTER COLUMN user_id DROP NOT NULL;


-- 2. RELAX RLS POLICIES

-- Function to relax policies for a given table
CREATE OR REPLACE FUNCTION relax_rls_policies(table_name text) RETURNS void AS $$
BEGIN
    -- Drop existing strict policies (ignore errors if they don't exist)
    BEGIN
        EXECUTE format('DROP POLICY IF EXISTS "Users can view their own %s" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own %s" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update their own %s" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own %s" ON %I', table_name, table_name);
        
        -- Also drop potentially previously created "Public" policies to reset them
        EXECUTE format('DROP POLICY IF EXISTS "Public view %s" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Public insert %s" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Public update %s" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Public delete %s" ON %I', table_name, table_name);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Create new policies
    EXECUTE format('CREATE POLICY "Public view %s" ON %I FOR SELECT USING ((auth.uid() = user_id) OR (user_id IS NULL))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Public insert %s" ON %I FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Public update %s" ON %I FOR UPDATE USING ((auth.uid() = user_id) OR (user_id IS NULL))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Public delete %s" ON %I FOR DELETE USING ((auth.uid() = user_id) OR (user_id IS NULL))', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to habit tracker tables
SELECT relax_rls_policies('habits');
SELECT relax_rls_policies('habit_completions');
SELECT relax_rls_policies('reading_ratings');

-- Apply to daily_journals if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_journals') THEN
        ALTER TABLE daily_journals ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
        ALTER TABLE daily_journals ALTER COLUMN user_id DROP NOT NULL;
        PERFORM relax_rls_policies('daily_journals');
    END IF;
END $$;

DROP FUNCTION relax_rls_policies(text);


-- 3. QUOTE LIKES (Maxim Ratings)

-- Create table if needed
CREATE TABLE IF NOT EXISTS maxim_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid(),
    maxim_number INTEGER NOT NULL,
    rating BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, maxim_number)
);

-- Enable RLS
ALTER TABLE maxim_ratings ENABLE ROW LEVEL SECURITY;

-- Relax Schema
ALTER TABLE maxim_ratings ALTER COLUMN user_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS maxim_ratings_null_user_idx ON maxim_ratings (maxim_number) WHERE user_id IS NULL;

-- Relax Policies
DROP POLICY IF EXISTS "Users can view their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Public handling of maxim ratings" ON maxim_ratings;

CREATE POLICY "Public handling of maxim ratings" ON maxim_ratings FOR ALL USING ((auth.uid() = user_id) OR (user_id IS NULL)) WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

-- Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_maxim_ratings_updated_at ON maxim_ratings;
CREATE TRIGGER update_maxim_ratings_updated_at BEFORE UPDATE ON maxim_ratings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMIT;
