import { NextResponse } from "next/server";
import { and, eq, notInArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conceptAnalysis, concepts, misconceptions, questions, sessionAttempts, uploads } from "@/lib/db/schema";
import { selectTargetedNotes } from "@/lib/ai/gemini";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const phase = new URL(req.url).searchParams.get("phase") ?? "practice";

  const attempts = await db
    .select({ attempt: sessionAttempts, question: questions })
    .from(sessionAttempts)
    .innerJoin(questions, eq(sessionAttempts.questionId, questions.id))
    .where(and(eq(sessionAttempts.sessionId, params.id), eq(sessionAttempts.phase, phase)));

  const [selected] = await db
    .select({ analysis: conceptAnalysis, concept: concepts })
    .from(conceptAnalysis)
    .innerJoin(concepts, eq(conceptAnalysis.conceptId, concepts.id))
    .where(eq(conceptAnalysis.sessionId, params.id))
    .limit(1);

  if (!selected) return NextResponse.json({ error: "Session concept not found" }, { status: 404 });

  if (attempts.length < 10) {
    const attemptedIds = attempts.map(({ attempt }) => attempt.questionId);
    const [remainingQuestion] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        and(
          eq(questions.conceptId, selected.concept.id),
          attemptedIds.length ? notInArray(questions.id, attemptedIds) : undefined,
        ),
      )
      .limit(1);

    if (remainingQuestion) {
      return NextResponse.json(
        {
          error: "Report is available only after 10 questions.",
          attempts: attempts.length,
          required: 10,
        },
        { status: 409 },
      );
    }
  }

  const wrong = attempts.filter(({ attempt }) => !attempt.isCorrect);
  const correctCount = attempts.length - wrong.length;
  const weak = wrong.length > 0;

  await db
    .update(conceptAnalysis)
    .set({
      questionsSeen: attempts.length,
      questionsRight: correctCount,
      identifiedWeak: weak,
    })
    .where(eq(conceptAnalysis.id, selected.analysis.id));

  const wrongMisconceptionIds = Array.from(new Set(wrong.map(({ attempt }) => attempt.misconceptionId).filter(Boolean))) as string[];
  const remediation = wrongMisconceptionIds.length
    ? await db.select().from(misconceptions).where(eq(misconceptions.conceptId, selected.concept.id))
    : [];

  const materials = weak
    ? await db
        .select()
        .from(uploads)
        .where(and(eq(uploads.conceptId, selected.concept.id), eq(uploads.uploadType, "study_material")))
    : [];

  const weakContext = wrong
    .map(({ attempt, question }, index) => `${index + 1}. ${question.stem}\nStudent chose: ${attempt.selectedKey}\nCorrect: ${question.correctKey}\nExplanation: ${question.explanation ?? ""}`)
    .join("\n\n");

  const targetedNotes = weak
    ? await Promise.all(
        materials.map(async (item) => ({
          id: item.id,
          name: item.originalName,
          url: item.storagePath,
          type: item.fileFormat,
          excerpt: await selectTargetedNotes({
            notesText: item.extractedText ?? item.processingNotes ?? "",
            weakContext,
          }),
        })),
      )
    : [];

  return NextResponse.json({
    concept: selected.concept,
    total: attempts.length,
    correct: correctCount,
    wrong: wrong.length,
    scorePercent: attempts.length ? Math.round((correctCount / attempts.length) * 100) : 0,
    status: weak ? "needs_review" : "strong",
    wrongQuestions: wrong.map(({ attempt, question }) => ({
      questionId: question.id,
      stem: question.stem,
      selectedKey: attempt.selectedKey,
      correctKey: question.correctKey,
      explanation: question.explanation,
      aiDiagnosis: attempt.aiDiagnosis,
    })),
    remediation: remediation.map((item) => ({
      id: item.id,
      description: item.description,
      remediationText: item.remediationText,
      workedExample: item.workedExample,
    })),
    materials: targetedNotes,
  });
}
