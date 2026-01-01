-- Create reading ratings table for storing user ratings of daily readings
CREATE TABLE IF NOT EXISTS reading_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL,
  reading_date DATE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_id, reading_date)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reading_ratings_book_date ON reading_ratings(book_id, reading_date);
