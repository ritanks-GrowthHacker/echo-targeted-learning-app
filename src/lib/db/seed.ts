import { hashSync } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { concepts, misconceptions, questions, users, type QuestionOption } from "@/lib/db/schema";

const conceptSeeds = [
  ["rest-and-motion", "Rest and Motion", []],
  ["distance-displacement", "Distance and Displacement", ["rest-and-motion"]],
  ["speed-velocity", "Speed and Velocity", ["distance-displacement"]],
  ["acceleration", "Acceleration", ["speed-velocity"]],
  ["equations-of-motion", "Equations of Motion", ["acceleration"]],
  ["motion-graphs", "Motion Graphs", ["equations-of-motion"]],
  ["relative-motion", "Relative Motion", ["speed-velocity"]],
  ["projectile-motion", "Projectile Motion", ["equations-of-motion", "relative-motion"]],
] as const;

const misconceptionSeeds: Record<string, Array<[string, string, string, string]>> = {
  "rest-and-motion": [
    ["MC_KIN_01", "Believes rest is absolute.", "Rest and motion are relative to a chosen reference frame. The same body can be described differently by observers in different frames.", "Passenger in a train at $v=60\\,km/h$ east: velocity is $0$ relative to train and $60\\hat{i}\\,km/h$ relative to ground."],
    ["MC_KIN_02", "Thinks one object cannot be both at rest and moving.", "An object can be at rest relative to one observer and moving relative to another. Always specify the frame before describing motion.", "A book in a moving car is at rest relative to the car but moves at $80\\,km/h$ relative to the road."],
  ],
  "distance-displacement": [
    ["MC_KIN_03", "Confuses path length with shortest change in position.", "Distance is total path length, while displacement is the vector from initial to final position.", "A particle moves $3\\,m$ east then $4\\,m$ north: distance $=7\\,m$, displacement $=5\\,m$."],
    ["MC_KIN_04", "Treats displacement as always positive distance.", "Displacement has direction and can be zero even when distance is non-zero.", "One full round of a circular track has distance $2\\pi r$ and displacement $0$."],
  ],
  "speed-velocity": [
    ["MC_KIN_05", "Confuses scalar speed with vector velocity.", "Speed has magnitude only; velocity has magnitude and direction.", "A car at $20\\,m/s$ east has speed $20\\,m/s$ and velocity $20\\hat{i}\\,m/s$."],
    ["MC_KIN_06", "Uses average speed formula for average velocity.", "Average speed is total distance over time; average velocity is displacement over time.", "Round trip in $10\\,s$: average speed may be non-zero, average velocity is $0$."],
  ],
  acceleration: [
    ["MC_KIN_07", "Thinks acceleration needs increasing speed.", "Acceleration is change in velocity per unit time, so direction changes also count.", "Uniform circular motion has constant speed but non-zero centripetal acceleration."],
    ["MC_KIN_08", "Ignores negative acceleration sign.", "The sign of acceleration depends on chosen positive direction, not simply slowing down.", "If upward is positive, a rising ball has $a=-g$ even before it starts falling."],
  ],
  "equations-of-motion": [
    ["MC_KIN_09", "Uses SUVAT equations when acceleration is not constant.", "The equations $v=u+at$, $s=ut+\\frac12at^2$ apply only for constant acceleration.", "For constant $a=2\\,m/s^2$, $u=3\\,m/s$, after $4\\,s$, $v=11\\,m/s$."],
    ["MC_KIN_10", "Mixes signs of $u$, $v$, $a$, and $s$.", "Choose one positive direction and keep all vector quantities consistent with it.", "For vertical throw upward, take upward positive: $a=-g$ throughout."],
  ],
  "motion-graphs": [
    ["MC_KIN_11", "Reads graph height instead of slope.", "On a displacement-time graph, velocity is slope. On a velocity-time graph, acceleration is slope.", "Straight $x-t$ graph from $(0,0)$ to $(4,8)$ has velocity $2\\,m/s$."],
    ["MC_KIN_12", "Forgets area under a velocity-time graph.", "Displacement equals signed area under the velocity-time graph.", "Triangle under $v-t$ with base $6\\,s$ and height $10\\,m/s$ gives $30\\,m$."],
  ],
  "relative-motion": [
    ["MC_KIN_13", "Subtracts velocities in the wrong order.", "Velocity of A relative to B is $\\vec v_A-\\vec v_B$.", "If $v_A=20\\hat{i}$ and $v_B=5\\hat{i}$, then $v_{A/B}=15\\hat{i}\\,m/s$."],
    ["MC_KIN_14", "Adds speeds without considering direction.", "Relative velocity is a vector difference, so directions must be included.", "Two cars at $10$ and $15\\,m/s$ opposite directions have relative speed $25\\,m/s$."],
  ],
  "projectile-motion": [
    ["MC_KIN_15", "Thinks horizontal acceleration exists without air resistance.", "In ideal projectile motion, horizontal velocity is constant and vertical acceleration is $g$ downward.", "$v_x=u\\cos\\theta$ remains constant while $v_y=u\\sin\\theta-gt$."],
    ["MC_KIN_16", "Mixes range and maximum height formulas.", "Range depends on horizontal motion and time of flight; height depends on vertical velocity.", "$R=\\frac{u^2\\sin2\\theta}{g}$ and $H=\\frac{u^2\\sin^2\\theta}{2g}$ for level ground."],
  ],
};

const templates = {
  easy: [
    (title: string) => `In ${title}, which statement is correct for a standard JEE frame-of-reference question?`,
    (title: string) => `A student solves a ${title} problem. Which relation is the safest starting idea?`,
    (title: string) => `For ${title}, identify the physically correct interpretation.`,
  ],
  medium: [
    (title: string) => `A numerical ${title} question gives consistent SI data. Which option follows from the core definition?`,
    (title: string) => `In a two-step ${title} situation, which reasoning avoids the common trap?`,
    (title: string) => `A JEE-style ${title} item asks for the final physical quantity. Which result is consistent?`,
  ],
  hard: [
    (title: string) => `A multi-concept ${title} problem combines equations and signs. Which conclusion is valid?`,
    (title: string) => `For an advanced ${title} scenario, which option remains correct after checking units and direction?`,
    (title: string) => `In a tricky ${title} question, which answer survives a reference-frame/sign audit?`,
  ],
} as const;

async function main() {
  await db.execute(sql.raw(`
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

    CREATE TABLE IF NOT EXISTS concepts (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    ALTER TABLE concepts ADD COLUMN IF NOT EXISTS slug text;
    ALTER TABLE concepts ADD COLUMN IF NOT EXISTS title text;
    ALTER TABLE concepts ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE concepts ADD COLUMN IF NOT EXISTS order_index integer;
    ALTER TABLE concepts ADD COLUMN IF NOT EXISTS prerequisite_slugs text[] NOT NULL DEFAULT '{}';
    ALTER TABLE concepts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    UPDATE concepts SET slug = COALESCE(slug, id::text) WHERE slug IS NULL;
    UPDATE concepts SET title = COALESCE(title, slug) WHERE title IS NULL;
    UPDATE concepts SET order_index = COALESCE(order_index, 0) WHERE order_index IS NULL;
    ALTER TABLE concepts ALTER COLUMN slug SET NOT NULL;
    ALTER TABLE concepts ALTER COLUMN title SET NOT NULL;
    ALTER TABLE concepts ALTER COLUMN order_index SET NOT NULL;
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'concepts' AND column_name = 'topic_id'
      ) THEN
        EXECUTE 'ALTER TABLE concepts ALTER COLUMN topic_id DROP NOT NULL';
      END IF;
    END $$;
    CREATE UNIQUE INDEX IF NOT EXISTS concepts_slug_unique ON concepts(slug);

    CREATE TABLE IF NOT EXISTS misconceptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS concept_id uuid REFERENCES concepts(id) ON DELETE CASCADE;
    ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS code text;
    ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS remediation_text text;
    ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS worked_example text;
    ALTER TABLE misconceptions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    UPDATE misconceptions SET code = COALESCE(code, id::text) WHERE code IS NULL;
    UPDATE misconceptions SET description = COALESCE(description, '') WHERE description IS NULL;
    UPDATE misconceptions SET remediation_text = COALESCE(remediation_text, '') WHERE remediation_text IS NULL;
    ALTER TABLE misconceptions ALTER COLUMN code SET NOT NULL;
    ALTER TABLE misconceptions ALTER COLUMN description SET NOT NULL;
    ALTER TABLE misconceptions ALTER COLUMN remediation_text SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS misconceptions_code_unique ON misconceptions(code);

    CREATE TABLE IF NOT EXISTS uploads (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS upload_type upload_type;
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_format file_format;
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS original_name text;
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS storage_path text;
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS concept_id uuid REFERENCES concepts(id) ON DELETE SET NULL;
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS extracted_text text;
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processed boolean DEFAULT false;
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processing_notes text;
    ALTER TABLE uploads ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

    CREATE TABLE IF NOT EXISTS questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS concept_id uuid REFERENCES concepts(id) ON DELETE CASCADE;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS stem text;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty difficulty;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS options jsonb;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_key text;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation text;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_upload_id uuid REFERENCES uploads(id) ON DELETE SET NULL;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    CREATE INDEX IF NOT EXISTS questions_concept_id_idx ON questions(concept_id);
    CREATE INDEX IF NOT EXISTS questions_concept_difficulty_idx ON questions(concept_id, difficulty);

    CREATE TABLE IF NOT EXISTS practice_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS status session_status DEFAULT 'active';
    ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS phase text DEFAULT 'diagnostic';
    ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now();
    ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS completed_at timestamptz;
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'practice_sessions' AND column_name = 'topic_id'
      ) THEN
        EXECUTE 'ALTER TABLE practice_sessions ALTER COLUMN topic_id DROP NOT NULL';
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS session_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    ALTER TABLE session_attempts ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES practice_sessions(id) ON DELETE CASCADE;
    ALTER TABLE session_attempts ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES questions(id) ON DELETE CASCADE;
    ALTER TABLE session_attempts ADD COLUMN IF NOT EXISTS selected_key text;
    ALTER TABLE session_attempts ADD COLUMN IF NOT EXISTS is_correct boolean;
    ALTER TABLE session_attempts ADD COLUMN IF NOT EXISTS misconception_id uuid REFERENCES misconceptions(id) ON DELETE SET NULL;
    ALTER TABLE session_attempts ADD COLUMN IF NOT EXISTS ai_diagnosis text;
    ALTER TABLE session_attempts ADD COLUMN IF NOT EXISTS phase text;
    ALTER TABLE session_attempts ADD COLUMN IF NOT EXISTS attempted_at timestamptz DEFAULT now();
    CREATE INDEX IF NOT EXISTS session_attempts_session_id_idx ON session_attempts(session_id);

    CREATE TABLE IF NOT EXISTS student_mastery (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    ALTER TABLE student_mastery ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE student_mastery ADD COLUMN IF NOT EXISTS concept_id uuid REFERENCES concepts(id) ON DELETE CASCADE;
    ALTER TABLE student_mastery ADD COLUMN IF NOT EXISTS mastery_score numeric(4,3) DEFAULT 0.000;
    ALTER TABLE student_mastery ADD COLUMN IF NOT EXISTS status mastery_status DEFAULT 'weak';
    ALTER TABLE student_mastery ADD COLUMN IF NOT EXISTS total_attempts integer DEFAULT 0;
    ALTER TABLE student_mastery ADD COLUMN IF NOT EXISTS correct_count integer DEFAULT 0;
    ALTER TABLE student_mastery ADD COLUMN IF NOT EXISTS last_updated timestamptz DEFAULT now();
    CREATE UNIQUE INDEX IF NOT EXISTS student_mastery_user_concept_unique ON student_mastery(user_id, concept_id);
    CREATE INDEX IF NOT EXISTS student_mastery_user_id_idx ON student_mastery(user_id);
    CREATE INDEX IF NOT EXISTS student_mastery_concept_id_idx ON student_mastery(concept_id);

    CREATE TABLE IF NOT EXISTS concept_analysis (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    ALTER TABLE concept_analysis ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES practice_sessions(id) ON DELETE CASCADE;
    ALTER TABLE concept_analysis ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE concept_analysis ADD COLUMN IF NOT EXISTS concept_id uuid REFERENCES concepts(id) ON DELETE CASCADE;
    ALTER TABLE concept_analysis ADD COLUMN IF NOT EXISTS questions_seen integer DEFAULT 0;
    ALTER TABLE concept_analysis ADD COLUMN IF NOT EXISTS questions_right integer DEFAULT 0;
    ALTER TABLE concept_analysis ADD COLUMN IF NOT EXISTS identified_weak boolean DEFAULT false;
    ALTER TABLE concept_analysis ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    CREATE INDEX IF NOT EXISTS concept_analysis_user_id_idx ON concept_analysis(user_id);
    CREATE INDEX IF NOT EXISTS concept_analysis_session_id_idx ON concept_analysis(session_id);
  `));

  await db
    .insert(users)
    .values({
      name: "Echo Admin",
      email: "admin@echo.local",
      passwordHash: hashSync("admin123", 10),
      role: "admin",
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      name: "Demo Student",
      email: "student@echo.local",
      passwordHash: hashSync("student123", 10),
      role: "student",
    })
    .onConflictDoNothing();

  const conceptBySlug = new Map<string, string>();
  for (let i = 0; i < conceptSeeds.length; i++) {
    const [slug, title, prerequisites] = conceptSeeds[i];
    const [row] = await db
      .insert(concepts)
      .values({
        slug,
        title,
        description: `${title} for JEE/NEET Kinematics adaptive practice.`,
        orderIndex: i + 1,
        prerequisiteSlugs: [...prerequisites],
      })
      .onConflictDoUpdate({
        target: concepts.slug,
        set: { title, orderIndex: i + 1, prerequisiteSlugs: [...prerequisites] },
      })
      .returning();
    conceptBySlug.set(slug, row.id);
  }

  const misconceptionBySlug = new Map<string, string[]>();
  for (const [slug, rows] of Object.entries(misconceptionSeeds)) {
    const conceptId = conceptBySlug.get(slug)!;
    const ids: string[] = [];
    for (const [code, description, remediationText, workedExample] of rows) {
      const [row] = await db
        .insert(misconceptions)
        .values({ conceptId, code, description, remediationText, workedExample })
        .onConflictDoUpdate({
          target: misconceptions.code,
          set: { description, remediationText, workedExample },
        })
        .returning();
      ids.push(row.id);
    }
    misconceptionBySlug.set(slug, ids);
  }

  for (const [slug, title] of conceptSeeds) {
    const conceptId = conceptBySlug.get(slug)!;
    const mcIds = misconceptionBySlug.get(slug)!;
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      for (let i = 0; i < 3; i++) {
        const stem = templates[difficulty][i](title);
        const existing = await db.select().from(questions).where(eq(questions.stem, stem)).limit(1);
        if (existing.length) continue;
        const options: QuestionOption[] = [
          { key: "A", text: `Use the definition with a clear frame and sign convention.`, misconception_id: null },
          { key: "B", text: `Ignore direction because only magnitude matters.`, misconception_id: mcIds[0] },
          { key: "C", text: `Use the final value alone without comparing initial and final states.`, misconception_id: mcIds[1] },
          { key: "D", text: `Choose the numerically largest option because it is usually the path quantity.`, misconception_id: mcIds[i % 2] },
        ];
        await db.insert(questions).values({
          conceptId,
          stem,
          difficulty,
          options,
          correctKey: "A",
          explanation: `For ${title}, the correct approach is to start from the definition, preserve direction/sign, and check units.`,
        });
      }
    }
  }

  console.log("Seed complete: 8 concepts, 16 misconceptions, 72 questions, admin@echo.local/admin123.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
