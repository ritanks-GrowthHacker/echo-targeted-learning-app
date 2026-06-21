import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { diagnoseMisconception } from "@/lib/ai/gemini";
import { updateMastery } from "@/lib/bkt";
import { getQuestionById } from "@/lib/db/queries/questions";
import { sessionAttempts, misconceptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId, selectedKey, phase } = await req.json();
  const question = await getQuestionById(questionId);
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isCorrect = selectedKey === question.correctKey;
  const selectedOption = question.options.find((option) => option.key === selectedKey);
  const misconceptionId = isCorrect ? null : selectedOption?.misconception_id ?? null;
  const aiDiagnosis = isCorrect
    ? null
    : await diagnoseMisconception({
        questionStem: question.stem,
        options: question.options,
        selectedKey,
        correctKey: question.correctKey,
      });

  await db.insert(sessionAttempts).values({
    sessionId: params.id,
    questionId,
    selectedKey,
    isCorrect,
    misconceptionId,
    aiDiagnosis,
    phase,
  });

  await updateMastery(session.user.id, question.conceptId, isCorrect);

  const [remediation] = misconceptionId
    ? await db.select().from(misconceptions).where(eq(misconceptions.id, misconceptionId)).limit(1)
    : [];

  return NextResponse.json({
    isCorrect,
    correctKey: question.correctKey,
    explanation: question.explanation,
    misconceptionId,
    aiDiagnosis,
    remediationContent: remediation ?? null,
  });
}
