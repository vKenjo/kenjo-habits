-- ============================================================================
-- FIX SCRIPT: Run this entire script in your Supabase SQL Editor to fix 
-- quote likes and habit tracker issues.
-- ============================================================================

BEGIN;

-- 1. FIX HABIT TRACKER (Relax RLS policies)

-- Function to relax policies for a given table
CREATE OR REPLACE FUNCTION relax_rls_policies(table_name text) RETURNS void AS $$
BEGIN
    -- Drop existing strict policies
    EXECUTE format('DROP POLICY IF EXISTS "Users can view their own %s" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own %s" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update their own %s" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own %s" ON %I', table_name, table_name);

    -- Create new policies that handle both auth user and null user (public/local usage)
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
        PERFORM relax_rls_policies('daily_journals');
    END IF;
END $$;

DROP FUNCTION relax_rls_policies(text);

-- Ensure user_id is nullable
ALTER TABLE habits ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE habit_completions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE reading_ratings ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE daily_journals ALTER COLUMN user_id DROP NOT NULL; -- Handle conditionally if needed or error if missing

-- 2. FIX QUOTE LIKES (Schema update for maxim_ratings)

-- Make user_id nullable
ALTER TABLE maxim_ratings ALTER COLUMN user_id DROP NOT NULL;

-- Allow unique ratings for null users (local mode)
CREATE UNIQUE INDEX IF NOT EXISTS maxim_ratings_null_user_idx ON maxim_ratings (maxim_number) WHERE user_id IS NULL;

-- Update RLS for maxim_ratings
DROP POLICY IF EXISTS "Users can view their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON maxim_ratings;

CREATE POLICY "Public handling of maxim ratings" ON maxim_ratings FOR ALL USING ((auth.uid() = user_id) OR (user_id IS NULL)) WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

COMMIT;
