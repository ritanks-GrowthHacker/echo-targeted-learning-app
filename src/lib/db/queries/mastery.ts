import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { concepts, studentMastery } from "@/lib/db/schema";
import { KINEMATICS_SLUGS } from "@/lib/db/queries/questions";

export async function getStudentProgress(userId: string) {
  return db
    .select({ concept: concepts, mastery: studentMastery })
    .from(concepts)
    .leftJoin(studentMastery, and(eq(studentMastery.conceptId, concepts.id), eq(studentMastery.userId, userId)))
    .where(inArray(concepts.slug, KINEMATICS_SLUGS))
    .orderBy(asc(concepts.orderIndex));
}
