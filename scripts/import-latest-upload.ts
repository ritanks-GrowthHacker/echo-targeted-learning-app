import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { createRequire } from "module";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { concepts, questions, type QuestionOption } from "@/lib/db/schema";
import { inferLocalAnswer, inferLocalDifficulty, localExplanation, parseLocalMCQs } from "@/lib/ai/local-mcq-parser";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse/lib/pdf-parse.js") as (buffer: Buffer) => Promise<{ text: string }>;

async function main() {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const latest = readdirSync(uploadDir)
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .map((name) => ({ name, fullPath: path.join(uploadDir, name), time: statSync(path.join(uploadDir, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time)[0];

  if (!latest) throw new Error("No uploaded PDF found in public/uploads.");

  const [concept] = await db.select().from(concepts).where(eq(concepts.slug, "rest-and-motion")).limit(1);
  if (!concept) throw new Error("Rest and Motion concept not found.");

  const parsed = await pdf(readFileSync(latest.fullPath));
  const localQuestions = parseLocalMCQs(parsed.text);
  let inserted = 0;
  let skipped = 0;

  for (const item of localQuestions) {
    const existing = await db.query.questions.findFirst({
      where: (q, { and, eq }) => and(eq(q.conceptId, concept.id), eq(q.stem, item.stem)),
    });
    if (existing) {
      skipped++;
      continue;
    }

    const correctKey = inferLocalAnswer(item);
    const options: QuestionOption[] = item.options.map((option) => ({
      ...option,
      misconception_id: option.key === correctKey ? null : null,
    }));

    await db.insert(questions).values({
      conceptId: concept.id,
      stem: item.stem,
      difficulty: inferLocalDifficulty(item),
      options,
      correctKey,
      explanation: localExplanation(item, correctKey),
    });
    inserted++;
  }

  console.log(`Imported ${inserted} questions from ${latest.name}. Skipped ${skipped} duplicates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .then(() => process.exit(0));
