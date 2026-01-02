-- Create table for maxim ratings
CREATE TABLE IF NOT EXISTS maxim_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    maxim_number INTEGER NOT NULL,
    rating BOOLEAN NOT NULL, -- true for like, false for dislike
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, maxim_number)
);

-- Enable RLS
ALTER TABLE maxim_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own ratings"
    ON maxim_ratings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ratings"
    ON maxim_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
    ON maxim_ratings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
    ON maxim_ratings FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_maxim_ratings_updated_at
    BEFORE UPDATE ON maxim_ratings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
