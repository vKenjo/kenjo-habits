-- Habit Tracker Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sort_order INTEGER DEFAULT 0
);

-- Create habit completions table
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, completed_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completed_date);

-- Enable Row Level Security (optional - for authenticated users)
-- ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- For public access (no authentication), create permissive policies
-- This allows anyone to read/write (good for personal use)

-- Allow public read/write on habits
CREATE POLICY "Allow public read on habits" ON habits
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on habits" ON habits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete on habits" ON habits
  FOR DELETE USING (true);

-- Allow public read/write on habit_completions
CREATE POLICY "Allow public read on habit_completions" ON habit_completions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on habit_completions" ON habit_completions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete on habit_completions" ON habit_completions
  FOR DELETE USING (true);
