import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { concepts, questions, sessionAttempts } from "@/lib/db/schema";

export const KINEMATICS_SLUGS = [
  "rest-and-motion",
  "distance-displacement",
  "speed-velocity",
  "acceleration",
  "equations-of-motion",
  "motion-graphs",
  "relative-motion",
  "projectile-motion",
];

export async function getConcepts() {
  return db
    .select()
    .from(concepts)
    .where(inArray(concepts.slug, KINEMATICS_SLUGS))
    .orderBy(asc(concepts.orderIndex));
}

export async function getDiagnosticQuestion(sessionId: string) {
  const seen = await db
    .select({ questionId: sessionAttempts.questionId })
    .from(sessionAttempts)
    .where(and(eq(sessionAttempts.sessionId, sessionId), eq(sessionAttempts.phase, "diagnostic")));

  const seenIds = seen.map((row) => row.questionId);
  const allConcepts = await getConcepts();

  for (const concept of allConcepts) {
    const [attemptedForConcept] = await db
      .select({ id: questions.id })
      .from(sessionAttempts)
      .innerJoin(questions, eq(sessionAttempts.questionId, questions.id))
      .where(
        and(
          eq(sessionAttempts.sessionId, sessionId),
          eq(sessionAttempts.phase, "diagnostic"),
          eq(questions.conceptId, concept.id),
        ),
      )
      .limit(1);

    if (!attemptedForConcept) {
      const rows = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.conceptId, concept.id),
            eq(questions.difficulty, "easy"),
            seenIds.length ? notInArray(questions.id, seenIds) : undefined,
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    }
  }

  return null;
}

export async function getQuestionById(id: string) {
  const [row] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return row ?? null;
}

export async function getConceptQuestion(conceptId: string, difficulty: "easy" | "medium" | "hard", excludeIds: string[] = []) {
  const [row] = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.conceptId, conceptId),
        eq(questions.difficulty, difficulty),
        excludeIds.length ? notInArray(questions.id, excludeIds) : undefined,
      ),
    )
    .limit(1);
  return row ?? null;
}
