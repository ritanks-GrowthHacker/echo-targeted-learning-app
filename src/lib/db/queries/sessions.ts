import { and, asc, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conceptAnalysis, concepts, practiceSessions, questions, sessionAttempts } from "@/lib/db/schema";

export async function createSession(userId: string) {
  const [session] = await db.insert(practiceSessions).values({ userId }).returning();
  return session;
}

export async function getSession(id: string, userId?: string) {
  const [session] = await db
    .select()
    .from(practiceSessions)
    .where(userId ? and(eq(practiceSessions.id, id), eq(practiceSessions.userId, userId)) : eq(practiceSessions.id, id))
    .limit(1);
  return session ?? null;
}

export async function completeSession(id: string) {
  await db
    .update(practiceSessions)
    .set({ status: "completed", phase: "completed", completedAt: new Date() })
    .where(eq(practiceSessions.id, id));
}

export async function getWeakConcepts(sessionId: string) {
  return db
    .select({ concept: concepts, analysis: conceptAnalysis })
    .from(conceptAnalysis)
    .innerJoin(concepts, eq(conceptAnalysis.conceptId, concepts.id))
    .where(and(eq(conceptAnalysis.sessionId, sessionId), eq(conceptAnalysis.identifiedWeak, true)))
    .orderBy(asc(concepts.orderIndex));
}

export async function summarizeDiagnostic(sessionId: string, userId: string) {
  const rows = await db
    .select({
      conceptId: questions.conceptId,
      seen: sql<number>`count(*)::int`,
      right: sql<number>`sum(case when ${sessionAttempts.isCorrect} then 1 else 0 end)::int`,
    })
    .from(sessionAttempts)
    .innerJoin(questions, eq(sessionAttempts.questionId, questions.id))
    .where(and(eq(sessionAttempts.sessionId, sessionId), eq(sessionAttempts.phase, "diagnostic")))
    .groupBy(questions.conceptId);

  if (!rows.length) return [];

  await db.delete(conceptAnalysis).where(eq(conceptAnalysis.sessionId, sessionId));
  await db.insert(conceptAnalysis).values(
    rows.map((row) => ({
      sessionId,
      userId,
      conceptId: row.conceptId,
      questionsSeen: row.seen,
      questionsRight: row.right,
      identifiedWeak: row.right < row.seen,
    })),
  );

  await db.update(practiceSessions).set({ phase: "remediation" }).where(eq(practiceSessions.id, sessionId));
  return getWeakConcepts(sessionId);
}

export async function getAttempts(sessionId: string, phase?: string) {
  return db
    .select({ attempt: sessionAttempts, question: questions })
    .from(sessionAttempts)
    .innerJoin(questions, eq(sessionAttempts.questionId, questions.id))
    .where(phase ? and(eq(sessionAttempts.sessionId, sessionId), eq(sessionAttempts.phase, phase)) : eq(sessionAttempts.sessionId, sessionId))
    .orderBy(desc(sessionAttempts.attemptedAt));
}

export async function getFreshValidationQuestions(sessionId: string, conceptIds: string[]) {
  const attempts = await getAttempts(sessionId);
  const seenIds = attempts.map(({ attempt }) => attempt.questionId);

  return db
    .select()
    .from(questions)
    .where(
      and(
        inArray(questions.conceptId, conceptIds),
        seenIds.length ? notInArray(questions.id, seenIds) : undefined,
      ),
    )
    .limit(conceptIds.length * 2);
}
