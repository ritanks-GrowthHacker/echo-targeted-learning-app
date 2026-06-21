import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSession } from "@/lib/db/queries/sessions";
import { db } from "@/lib/db";
import { conceptAnalysis } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const practiceSession = await createSession(session.user.id);
  if (body.conceptId) {
    await db.insert(conceptAnalysis).values({
      sessionId: practiceSession.id,
      userId: session.user.id,
      conceptId: body.conceptId,
      questionsSeen: 0,
      questionsRight: 0,
      identifiedWeak: false,
    });
  }
  return NextResponse.json({ sessionId: practiceSession.id });
}
