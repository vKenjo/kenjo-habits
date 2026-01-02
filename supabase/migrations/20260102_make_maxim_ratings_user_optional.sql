-- Make user_id nullable for local/single-tenant usage
ALTER TABLE maxim_ratings ALTER COLUMN user_id DROP NOT NULL;

-- Accept null user_id in unique constraint (if needed, but standard unique index handles nulls differently - usually allows multiple nulls. 
-- However, for a single tenant local app, we might want to ensure only one rating per maxim overall if user_id is null?
-- Or we just rely on the app logic.
-- Let's check existing unique constraint: "UNIQUE(user_id, maxim_number)"
-- In Postgres, unique constraints allow multiple NULLs. So multiple ratings for maxim #1 with NULL user_id would be allowed.
-- This might be okay if we treat NULL user_id as "default user".
-- To strictly enforce one rating per maxim for the "default user" (NULL user_id), we need a unique index.

CREATE UNIQUE INDEX IF NOT EXISTS maxim_ratings_null_user_idx ON maxim_ratings (maxim_number) WHERE user_id IS NULL;

-- Update RLS policies to allow access when user_id is null (public/anon access)

-- Drop existing policies to recreate them safely or just add new ones
DROP POLICY IF EXISTS "Users can view their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON maxim_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON maxim_ratings;

-- Create new policies that handle both auth user and null user
CREATE POLICY "Public handling of maxim ratings"
    ON maxim_ratings
    FOR ALL
    USING (
        (auth.uid() = user_id) OR (user_id IS NULL)
    )
    WITH CHECK (
        (auth.uid() = user_id) OR (user_id IS NULL)
    );
