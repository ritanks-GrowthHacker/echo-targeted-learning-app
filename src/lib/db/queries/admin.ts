import { avg, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { concepts, practiceSessions, questions, sessionAttempts, studentMastery, users } from "@/lib/db/schema";

export async function getStudents() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      lastActive: sql<Date | null>`max(${sessionAttempts.attemptedAt})`,
      overallMastery: avg(studentMastery.masteryScore),
    })
    .from(users)
    .leftJoin(studentMastery, eq(studentMastery.userId, users.id))
    .leftJoin(sessionAttempts, sql`${sessionAttempts.sessionId} in (select id from practice_sessions where user_id = ${users.id})`)
    .where(eq(users.role, "student"))
    .groupBy(users.id)
    .orderBy(users.name);
}

export async function getStudentAnalysis(userId: string) {
  const ps = alias(practiceSessions, "ps");
  const [student] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const mastery = await db
    .select({ concept: concepts, mastery: studentMastery })
    .from(concepts)
    .leftJoin(studentMastery, sql`${studentMastery.conceptId} = ${concepts.id} and ${studentMastery.userId} = ${userId}`)
    .orderBy(concepts.orderIndex);

  const attempts = await db
    .select({ attempt: sessionAttempts, question: questions })
    .from(sessionAttempts)
    .innerJoin(questions, eq(sessionAttempts.questionId, questions.id))
    .innerJoin(ps, eq(ps.id, sessionAttempts.sessionId))
    .where(eq(ps.userId, userId))
    .orderBy(desc(sessionAttempts.attemptedAt))
    .limit(20);

  return { student, mastery, attempts };
}
