import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConceptQuestion, getDiagnosticQuestion } from "@/lib/db/queries/questions";
import { getAttempts, getWeakConcepts, summarizeDiagnostic } from "@/lib/db/queries/sessions";
import { conceptAnalysis, misconceptions, questions, sessionAttempts } from "@/lib/db/schema";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { markStrong } from "@/lib/bkt";

const difficulties = ["easy", "medium", "hard"] as const;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const phase = new URL(req.url).searchParams.get("phase") ?? "diagnostic";

  if (phase === "practice" || phase === "retest") {
    const [selected] = await db
      .select()
      .from(conceptAnalysis)
      .where(eq(conceptAnalysis.sessionId, params.id))
      .limit(1);
    if (!selected) return NextResponse.json({ error: "No concept selected" }, { status: 400 });

    const answered = await db
      .select({ id: sessionAttempts.questionId })
      .from(sessionAttempts)
      .where(and(eq(sessionAttempts.sessionId, params.id), eq(sessionAttempts.phase, phase)));
    if (answered.length >= 10) return NextResponse.json({ complete: true });

    const answeredIds = answered.map((row) => row.id);
    const [question] = await db
      .select()
      .from(questions)
      .where(
        and(
          eq(questions.conceptId, selected.conceptId),
          answeredIds.length ? notInArray(questions.id, answeredIds) : undefined,
        ),
      )
      .orderBy(sql`random()`)
      .limit(1);

    return NextResponse.json({ question: question ?? null, complete: !question, answered: answered.length, total: 10 });
  }

  if (phase === "diagnostic") {
    const question = await getDiagnosticQuestion(params.id);
    if (question) return NextResponse.json({ question });
    const weak = await summarizeDiagnostic(params.id, session.user.id);
    return NextResponse.json({ analysisReady: true, weakConcepts: weak.map((row) => row.concept) });
  }

  const weakRows = await getWeakConcepts(params.id);
  if (!weakRows.length) return NextResponse.json({ complete: true, weakConcepts: [] });

  if (phase === "validation") {
    const answered = await db
      .select({ id: sessionAttempts.questionId })
      .from(sessionAttempts)
      .where(and(eq(sessionAttempts.sessionId, params.id), eq(sessionAttempts.phase, "validation")));
    const answeredIds = answered.map((row) => row.id);
    const [question] = await db
      .select()
      .from(questions)
      .where(
        and(
          inArray(questions.conceptId, weakRows.map((row) => row.concept.id)),
          answeredIds.length ? notInArray(questions.id, answeredIds) : undefined,
        ),
      )
      .limit(weakRows.length * 2);
    return NextResponse.json({ question: question ?? null, complete: !question });
  }

  const attempts = await getAttempts(params.id, "remediation");
  for (const { concept } of weakRows) {
    const passed = new Set(
      attempts
        .filter(({ attempt, question }) => question.conceptId === concept.id && attempt.isCorrect)
        .map(({ question }) => question.difficulty),
    );
    if (difficulties.every((difficulty) => passed.has(difficulty))) {
      await markStrong(session.user.id, concept.id);
      continue;
    }
    const currentDifficulty = difficulties.find((difficulty) => !passed.has(difficulty)) ?? "easy";
    const triedIds = attempts
      .filter(({ question }) => question.conceptId === concept.id && question.difficulty === currentDifficulty)
      .map(({ question }) => question.id);
    const question = await getConceptQuestion(concept.id, currentDifficulty, triedIds);
    const [misconception] = await db.select().from(misconceptions).where(eq(misconceptions.conceptId, concept.id)).limit(1);
    return NextResponse.json({ concept, misconception, difficulty: currentDifficulty, question });
  }

  return NextResponse.json({ remediationComplete: true });
}
