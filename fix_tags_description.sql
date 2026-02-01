-- Fix for missing description column in tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS description TEXT;
