-- Add user_id column and enable RLS for habits
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habits"
    ON habits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
    ON habits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
    ON habits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
    ON habits FOR DELETE
    USING (auth.uid() = user_id);

-- Add user_id column and enable RLS for habit_completions
ALTER TABLE habit_completions 
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions"
    ON habit_completions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
    ON habit_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions"
    ON habit_completions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
    ON habit_completions FOR DELETE
    USING (auth.uid() = user_id);

-- Add user_id column and enable RLS for reading_ratings
ALTER TABLE reading_ratings 
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

ALTER TABLE reading_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reading ratings"
    ON reading_ratings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading ratings"
    ON reading_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading ratings"
    ON reading_ratings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading ratings"
    ON reading_ratings FOR DELETE
    USING (auth.uid() = user_id);

-- Add user_id column and enable RLS for daily_journals (checks if table exists first just in case)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'daily_journals') THEN
        ALTER TABLE daily_journals 
        ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

        ALTER TABLE daily_journals ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their own journals"
            ON daily_journals FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own journals"
            ON daily_journals FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own journals"
            ON daily_journals FOR UPDATE
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own journals"
            ON daily_journals FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;
