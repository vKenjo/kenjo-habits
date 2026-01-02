-- Relax RLS policies to allow single-tenant/local usage (where user_id is null)

-- Function to relax policies for a given table
CREATE OR REPLACE FUNCTION relax_rls_policies(table_name text) RETURNS void AS $$
BEGIN
    -- Drop existing strict policies
    EXECUTE format('DROP POLICY IF EXISTS "Users can view their own %s" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own %s" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update their own %s" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own %s" ON %I', table_name, table_name);

    -- Create new permissive policies (allow if auth matches OR if user_id is null)
    
    -- SELECT
    EXECUTE format('CREATE POLICY "Public view %s" ON %I FOR SELECT USING ((auth.uid() = user_id) OR (user_id IS NULL))', table_name, table_name);
    
    -- INSERT
    EXECUTE format('CREATE POLICY "Public insert %s" ON %I FOR INSERT WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL))', table_name, table_name);
    
    -- UPDATE
    EXECUTE format('CREATE POLICY "Public update %s" ON %I FOR UPDATE USING ((auth.uid() = user_id) OR (user_id IS NULL))', table_name, table_name);
    
    -- DELETE
    EXECUTE format('CREATE POLICY "Public delete %s" ON %I FOR DELETE USING ((auth.uid() = user_id) OR (user_id IS NULL))', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
SELECT relax_rls_policies('habits');
SELECT relax_rls_policies('habit_completions');
SELECT relax_rls_policies('reading_ratings');

-- Daily journals might not exist, handle safely
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_journals') THEN
        PERFORM relax_rls_policies('daily_journals');
    END IF;
END $$;

-- Drop the helper function
DROP FUNCTION relax_rls_policies(text);

-- Ensure user_id is nullable for these tables (it should be by default if created without NOT NULL, but let's be safe)
ALTER TABLE habits ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE habit_completions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE reading_ratings ALTER COLUMN user_id DROP NOT NULL;

-- Note: maxim_ratings is handled in its own migration 20260102_make_maxim_ratings_user_optional.sql
