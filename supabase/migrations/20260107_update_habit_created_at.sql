-- Migration: Update created_at for first 3 habits to January 1, 2026
-- The first 3 habits (Read a book, Exercise, Journal) were created on Jan 1, 2026
-- We set the created_at to January 1, 2026 at midnight in Asia/Manila timezone (UTC+8)
-- This means 2025-12-31T16:00:00Z in UTC

-- Update habits by name to set their created_at to Jan 1, 2026 (Asia/Manila)
UPDATE habits
SET created_at = '2026-01-01T00:00:00+08:00'::timestamptz
WHERE name IN ('Read a book', 'Exercise', 'Journal');
