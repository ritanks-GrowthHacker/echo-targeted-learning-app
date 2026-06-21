import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const uploadTypeEnum = pgEnum("upload_type", ["question_bank", "study_material"]);
export const fileFormatEnum = pgEnum("file_format", ["pdf", "image", "word"]);
export const sessionStatusEnum = pgEnum("session_status", ["active", "completed"]);
export const masteryStatusEnum = pgEnum("mastery_status", ["weak", "building", "strong"]);

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("student"),
  createdAt,
});

export const concepts = pgTable("concepts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  prerequisiteSlugs: text("prerequisite_slugs").array().notNull().default([]),
  createdAt,
});

export const misconceptions = pgTable("misconceptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  conceptId: uuid("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  remediationText: text("remediation_text").notNull(),
  workedExample: text("worked_example"),
  createdAt,
});

export type QuestionOption = {
  key: "A" | "B" | "C" | "D";
  text: string;
  misconception_id: string | null;
};

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploadType: uploadTypeEnum("upload_type").notNull(),
  fileFormat: fileFormatEnum("file_format").notNull(),
  originalName: text("original_name").notNull(),
  storagePath: text("storage_path").notNull(),
  conceptId: uuid("concept_id").references(() => concepts.id, { onDelete: "set null" }),
  extractedText: text("extracted_text"),
  processed: boolean("processed").default(false),
  processingNotes: text("processing_notes"),
  createdAt,
});

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conceptId: uuid("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
    stem: text("stem").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    options: jsonb("options").$type<QuestionOption[]>().notNull(),
    correctKey: text("correct_key").notNull(),
    explanation: text("explanation"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    sourceUploadId: uuid("source_upload_id").references(() => uploads.id, { onDelete: "set null" }),
    createdAt,
  },
  (table) => ({
    conceptIdx: index("questions_concept_id_idx").on(table.conceptId),
    conceptDifficultyIdx: index("questions_concept_difficulty_idx").on(table.conceptId, table.difficulty),
  }),
);

export const practiceSessions = pgTable("practice_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: sessionStatusEnum("status").default("active"),
  phase: text("phase").default("diagnostic"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const sessionAttempts = pgTable(
  "session_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => practiceSessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    selectedKey: text("selected_key").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    misconceptionId: uuid("misconception_id").references(() => misconceptions.id, { onDelete: "set null" }),
    aiDiagnosis: text("ai_diagnosis"),
    phase: text("phase").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    sessionIdx: index("session_attempts_session_id_idx").on(table.sessionId),
  }),
);

export const studentMastery = pgTable(
  "student_mastery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    conceptId: uuid("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
    masteryScore: numeric("mastery_score", { precision: 4, scale: 3 }).default("0.000"),
    status: masteryStatusEnum("status").default("weak"),
    totalAttempts: integer("total_attempts").default(0),
    correctCount: integer("correct_count").default(0),
    lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userConceptUnique: unique("student_mastery_user_concept_unique").on(table.userId, table.conceptId),
    userIdx: index("student_mastery_user_id_idx").on(table.userId),
    conceptIdx: index("student_mastery_concept_id_idx").on(table.conceptId),
  }),
);

export const conceptAnalysis = pgTable(
  "concept_analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => practiceSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    conceptId: uuid("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
    questionsSeen: integer("questions_seen").default(0),
    questionsRight: integer("questions_right").default(0),
    identifiedWeak: boolean("identified_weak").default(false),
    createdAt,
  },
  (table) => ({
    userIdx: index("concept_analysis_user_id_idx").on(table.userId),
    sessionIdx: index("concept_analysis_session_id_idx").on(table.sessionId),
  }),
);
