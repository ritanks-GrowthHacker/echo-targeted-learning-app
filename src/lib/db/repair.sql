CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('student', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE upload_type AS ENUM ('question_bank', 'study_material'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE file_format AS ENUM ('pdf', 'image', 'word'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE session_status AS ENUM ('active', 'completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE mastery_status AS ENUM ('weak', 'building', 'strong'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'student';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
UPDATE users SET name = COALESCE(name, email, 'Student') WHERE name IS NULL;
UPDATE users SET password_hash = '' WHERE password_hash IS NULL;
ALTER TABLE IF EXISTS users ALTER COLUMN name SET NOT NULL;
ALTER TABLE IF EXISTS users ALTER COLUMN email SET NOT NULL;
ALTER TABLE IF EXISTS users ALTER COLUMN password_hash SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concepts' AND column_name = 'topic_id'
  ) THEN
    EXECUTE 'ALTER TABLE concepts ALTER COLUMN topic_id DROP NOT NULL';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'practice_sessions' AND column_name = 'topic_id'
  ) THEN
    EXECUTE 'ALTER TABLE practice_sessions ALTER COLUMN topic_id DROP NOT NULL';
  END IF;
END $$;
ALTER TABLE IF EXISTS uploads ADD COLUMN IF NOT EXISTS extracted_text text;
