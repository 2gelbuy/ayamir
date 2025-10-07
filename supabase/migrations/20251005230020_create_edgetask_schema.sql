/*
  # EdgeTask Database Schema

  ## Overview
  This migration creates the core database schema for EdgeTask, a productivity Chrome extension
  with task management, focus modes, and humorous reminders.

  ## Tables Created
  
  ### 1. tasks
  Stores user tasks with timing and notification tracking
  - `id` (uuid, primary key) - Unique task identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `title` (text) - Task description
  - `start_time` (timestamptz, nullable) - When task should start
  - `is_focused` (boolean) - Whether this is the active focus task
  - `is_completed` (boolean) - Task completion status
  - `created_at` (timestamptz) - Task creation timestamp
  - `completed_at` (timestamptz, nullable) - When task was completed
  - `snoozed_until` (timestamptz, nullable) - Snooze expiry time
  - `notified_at_10` (boolean) - 10-minute reminder sent flag
  - `notified_at_5` (boolean) - 5-minute reminder sent flag
  - `notified_at_0` (boolean) - Start time reminder sent flag

  ### 2. user_settings
  Stores user preferences for humor, nudges, and blocked sites
  - `id` (uuid, primary key) - Settings record identifier
  - `user_id` (uuid, foreign key, unique) - One settings record per user
  - `humor_tone` (text) - Humor style: polite, default, or sarcastic
  - `nudge_mode` (text) - Nudge intensity: soft or hard
  - `sound_enabled` (boolean) - Whether sounds are enabled
  - `volume` (integer) - Sound volume (0-100)
  - `blacklist` (text array) - Blocked domains during focus
  - `whitelist` (text array) - Always-allowed domains
  - `created_at` (timestamptz) - Settings creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security (Row Level Security)
  
  All tables have RLS enabled with policies that ensure:
  - Users can only access their own data
  - Authentication is required for all operations
  - Each policy is specific to its operation (SELECT, INSERT, UPDATE, DELETE)

  ## Indexes
  
  Performance indexes on frequently queried columns:
  - tasks.user_id - For fetching user's tasks
  - tasks.start_time - For reminder queries
  - tasks.is_completed - For filtering active tasks
  - user_settings.user_id - For settings lookup
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  start_time timestamptz,
  is_focused boolean DEFAULT false,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  snoozed_until timestamptz,
  notified_at_10 boolean DEFAULT false,
  notified_at_5 boolean DEFAULT false,
  notified_at_0 boolean DEFAULT false
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  humor_tone text DEFAULT 'default' CHECK (humor_tone IN ('polite', 'default', 'sarcastic')),
  nudge_mode text DEFAULT 'soft' CHECK (nudge_mode IN ('soft', 'hard')),
  sound_enabled boolean DEFAULT true,
  volume integer DEFAULT 50 CHECK (volume >= 0 AND volume <= 100),
  blacklist text[] DEFAULT ARRAY['youtube.com', 'reddit.com', 'twitter.com', 'facebook.com', 'instagram.com'],
  whitelist text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_start_time ON tasks(start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks table

-- Users can view their own tasks
CREATE POLICY "Users can view own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own tasks
CREATE POLICY "Users can insert own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_settings table

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at in user_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_user_settings_updated_at
      BEFORE UPDATE ON user_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
