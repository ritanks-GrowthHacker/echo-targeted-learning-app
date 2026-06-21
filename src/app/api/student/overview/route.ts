import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { concepts, practiceSessions, questions, sessionAttempts, studentMastery } from "@/lib/db/schema";
import { getStudentProgress } from "@/lib/db/queries/mastery";
import { percent, toNumber } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress = await getStudentProgress(session.user.id);
  const average = progress.reduce((sum, row) => sum + toNumber(row.mastery?.masteryScore), 0) / Math.max(progress.length, 1);
  const weak = progress
    .filter((row) => (row.mastery?.status ?? "weak") !== "strong")
    .map((row) => ({
      id: row.concept.id,
      title: row.concept.title,
      status: row.mastery?.status ?? "weak",
      score: percent(row.mastery?.masteryScore),
      attempts: row.mastery?.totalAttempts ?? 0,
    }));

  const recentAttempts = await db
    .select({
      id: sessionAttempts.id,
      selectedKey: sessionAttempts.selectedKey,
      isCorrect: sessionAttempts.isCorrect,
      phase: sessionAttempts.phase,
      attemptedAt: sessionAttempts.attemptedAt,
      stem: questions.stem,
      correctKey: questions.correctKey,
      conceptTitle: concepts.title,
    })
    .from(sessionAttempts)
    .innerJoin(practiceSessions, eq(sessionAttempts.sessionId, practiceSessions.id))
    .innerJoin(questions, eq(sessionAttempts.questionId, questions.id))
    .innerJoin(concepts, eq(questions.conceptId, concepts.id))
    .where(eq(practiceSessions.userId, session.user.id))
    .orderBy(desc(sessionAttempts.attemptedAt))
    .limit(8);

  const sessions = await db
    .select({
      id: practiceSessions.id,
      status: practiceSessions.status,
      startedAt: practiceSessions.startedAt,
      completedAt: practiceSessions.completedAt,
      attempts: sql<number>`count(${sessionAttempts.id})::int`,
      correct: sql<number>`sum(case when ${sessionAttempts.isCorrect} then 1 else 0 end)::int`,
    })
    .from(practiceSessions)
    .leftJoin(sessionAttempts, eq(sessionAttempts.sessionId, practiceSessions.id))
    .where(eq(practiceSessions.userId, session.user.id))
    .groupBy(practiceSessions.id)
    .orderBy(desc(practiceSessions.startedAt))
    .limit(5);

  const activeSession = sessions.find((item) => item.status === "active" && item.attempts > 0 && item.attempts < 10);

  return NextResponse.json({
    name: session.user.name,
    overallMastery: percent(average),
    conceptsTotal: progress.length,
    strongCount: progress.filter((row) => row.mastery?.status === "strong").length,
    weak,
    nextRecommended: weak[0] ?? null,
    activeSession,
    recentAttempts,
    sessions,
  });
}
