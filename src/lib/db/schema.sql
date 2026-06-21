CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('student', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE upload_type AS ENUM ('question_bank', 'study_material'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE file_format AS ENUM ('pdf', 'image', 'word'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE session_status AS ENUM ('active', 'completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE mastery_status AS ENUM ('weak', 'building', 'strong'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL,
  prerequisite_slugs text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'concepts' AND column_name = 'topic_id'
  ) THEN
    EXECUTE 'ALTER TABLE concepts ALTER COLUMN topic_id DROP NOT NULL';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS misconceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  description text NOT NULL,
  remediation_text text NOT NULL,
  worked_example text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  upload_type upload_type NOT NULL,
  file_format file_format NOT NULL,
  original_name text NOT NULL,
  storage_path text NOT NULL,
  concept_id uuid REFERENCES concepts(id) ON DELETE SET NULL,
  extracted_text text,
  processed boolean DEFAULT false,
  processing_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  stem text NOT NULL,
  difficulty difficulty NOT NULL,
  options jsonb NOT NULL,
  correct_key text NOT NULL,
  explanation text,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  source_upload_id uuid REFERENCES uploads(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status session_status DEFAULT 'active',
  phase text DEFAULT 'diagnostic',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'practice_sessions' AND column_name = 'topic_id'
  ) THEN
    EXECUTE 'ALTER TABLE practice_sessions ALTER COLUMN topic_id DROP NOT NULL';
  END IF;
END $$;
ALTER TABLE IF EXISTS uploads ADD COLUMN IF NOT EXISTS extracted_text text;

CREATE TABLE IF NOT EXISTS session_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_key text NOT NULL,
  is_correct boolean NOT NULL,
  misconception_id uuid REFERENCES misconceptions(id) ON DELETE SET NULL,
  ai_diagnosis text,
  phase text NOT NULL,
  attempted_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  mastery_score numeric(4,3) DEFAULT 0.000,
  status mastery_status DEFAULT 'weak',
  total_attempts integer DEFAULT 0,
  correct_count integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  CONSTRAINT student_mastery_user_concept_unique UNIQUE (user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS concept_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  questions_seen integer DEFAULT 0,
  questions_right integer DEFAULT 0,
  identified_weak boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_concept_id_idx ON questions(concept_id);
CREATE INDEX IF NOT EXISTS questions_concept_difficulty_idx ON questions(concept_id, difficulty);
CREATE INDEX IF NOT EXISTS session_attempts_session_id_idx ON session_attempts(session_id);
CREATE INDEX IF NOT EXISTS student_mastery_user_id_idx ON student_mastery(user_id);
CREATE INDEX IF NOT EXISTS student_mastery_concept_id_idx ON student_mastery(concept_id);
CREATE INDEX IF NOT EXISTS concept_analysis_user_id_idx ON concept_analysis(user_id);
CREATE INDEX IF NOT EXISTS concept_analysis_session_id_idx ON concept_analysis(session_id);
