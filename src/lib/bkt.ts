import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { studentMastery } from "@/lib/db/schema";
import { toNumber } from "@/lib/utils";

const P = { learn: 0.2, guess: 0.25, slip: 0.1 };

export function bktUpdate(pL: number, isCorrect: boolean): number {
  const evidence = isCorrect
    ? pL * (1 - P.slip) + (1 - pL) * P.guess
    : pL * P.slip + (1 - pL) * (1 - P.guess);
  const posterior = isCorrect
    ? (pL * (1 - P.slip)) / evidence
    : (pL * P.slip) / evidence;
  return Math.min(1, Math.max(0, posterior + (1 - posterior) * P.learn));
}

export function scoreToStatus(score: number): "weak" | "building" | "strong" {
  if (score < 0.4) return "weak";
  if (score < 0.75) return "building";
  return "strong";
}

export async function updateMastery(userId: string, conceptId: string, isCorrect: boolean) {
  const [current] = await db
    .select()
    .from(studentMastery)
    .where(and(eq(studentMastery.userId, userId), eq(studentMastery.conceptId, conceptId)))
    .limit(1);

  const newScore = bktUpdate(toNumber(current?.masteryScore), isCorrect);
  const status = scoreToStatus(newScore);

  await db
    .insert(studentMastery)
    .values({
      userId,
      conceptId,
      masteryScore: newScore.toFixed(3),
      status,
      totalAttempts: 1,
      correctCount: isCorrect ? 1 : 0,
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: [studentMastery.userId, studentMastery.conceptId],
      set: {
        masteryScore: newScore.toFixed(3),
        status,
        totalAttempts: sql`${studentMastery.totalAttempts} + 1`,
        correctCount: isCorrect
          ? sql`${studentMastery.correctCount} + 1`
          : sql`${studentMastery.correctCount}`,
        lastUpdated: new Date(),
      },
    });

  return { score: newScore, status };
}

export async function markStrong(userId: string, conceptId: string) {
  await db
    .insert(studentMastery)
    .values({
      userId,
      conceptId,
      masteryScore: "0.900",
      status: "strong",
      totalAttempts: 0,
      correctCount: 0,
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: [studentMastery.userId, studentMastery.conceptId],
      set: { masteryScore: "0.900", status: "strong", lastUpdated: new Date() },
    });
}
