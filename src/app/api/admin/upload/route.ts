import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createRequire } from "module";
import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { concepts, questions, uploads, type QuestionOption } from "@/lib/db/schema";
import { extractMCQFromText, extractTextFromImage } from "@/lib/ai/gemini";
import { inferLocalAnswer, inferLocalDifficulty, localExplanation, parseLocalMCQs } from "@/lib/ai/local-mcq-parser";

export const runtime = "nodejs";

async function extractPdf(buffer: Buffer) {
  const require = createRequire(import.meta.url);
  const parser = require("pdf-parse/lib/pdf-parse.js") as (buffer: Buffer) => Promise<{ text: string }>;
  const result = await parser(buffer);
  return result.text;
}

function detectFormat(type: string, name: string): "pdf" | "image" | "word" {
  const lower = name.toLowerCase();
  if (type.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (type.includes("word") || lower.endsWith(".docx")) return "word";
  return "image";
}

async function extractText(format: "pdf" | "image" | "word", bytes: Buffer, mimeType: string) {
  if (format === "pdf") return extractPdf(bytes);
  if (format === "word") return (await mammoth.extractRawText({ buffer: bytes })).value;
  return extractTextFromImage(bytes, mimeType);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const uploadType = String(formData.get("upload_type") ?? "study_material") as "question_bank" | "study_material";
  const conceptId = String(formData.get("concept_id") ?? "");
  if (!file || !conceptId) return NextResponse.json({ error: "File and concept are required" }, { status: 400 });

  const format = detectFormat(file.type, file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = format === "word" ? "docx" : format === "pdf" ? "pdf" : path.extname(file.name).replace(".", "") || "png";
  const filename = `${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);

  const [upload] = await db
    .insert(uploads)
    .values({
      uploadedBy: session.user.id,
      uploadType,
      fileFormat: format,
      originalName: file.name,
      storagePath: `/uploads/${filename}`,
      conceptId,
    })
    .returning();

  let extractedText = "";
  let questionsExtracted = 0;
  const previewQuestions: Array<{
    id: string;
    stem: string;
    difficulty: "easy" | "medium" | "hard";
    options: Array<{ key: string; text: string; misconception_id: string | null }>;
    correctKey: string;
    explanation: string | null;
  }> = [];

  try {
    extractedText = await extractText(format, bytes, file.type);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not extract text";
    await db.update(uploads).set({ processed: false, processingNotes: message }).where(eq(uploads.id, upload.id));
    return NextResponse.json({ success: false, error: message, uploadId: upload.id }, { status: 422 });
  }

  if (uploadType === "question_bank") {
    const [concept] = await db.select().from(concepts).where(eq(concepts.id, conceptId)).limit(1);
    const localQuestions = parseLocalMCQs(extractedText);
    let extracted: Awaited<ReturnType<typeof extractMCQFromText>> = localQuestions.map((question) => {
      const correctKey = inferLocalAnswer(question);
      return {
        stem: question.stem,
        options: question.options,
        difficulty: inferLocalDifficulty(question),
        correct_key: correctKey,
        explanation: localExplanation(question, correctKey),
      };
    });

    if (!extracted.length) {
      extracted = extractedText ? await extractMCQFromText(extractedText, concept.slug).catch(() => []) : [];
    }

    const [mcA, mcB] = await db.query.misconceptions.findMany({
      where: (m, { eq }) => eq(m.conceptId, conceptId),
      limit: 2,
    });

    for (const item of extracted) {
      const correctKey = String(item.correct_key ?? "").toUpperCase();
      const difficulty = item.difficulty;
      if (!["A", "B", "C", "D"].includes(correctKey) || item.options.length !== 4) continue;
      if (!["easy", "medium", "hard"].includes(difficulty)) continue;

      const duplicate = await db.query.questions.findFirst({
        where: (q, { and, eq }) => and(eq(q.conceptId, conceptId), eq(q.stem, item.stem)),
      });
      if (duplicate) continue;

      const options: QuestionOption[] = item.options.map((option, index) => ({
        key: String(option.key).toUpperCase() as "A" | "B" | "C" | "D",
        text: option.text,
        misconception_id: String(option.key).toUpperCase() === correctKey ? null : (index % 2 === 0 ? mcA?.id : mcB?.id) ?? null,
      }));

      const [inserted] = await db
        .insert(questions)
        .values({
          conceptId,
          stem: item.stem,
          difficulty,
          options,
          correctKey,
          explanation: item.explanation,
          uploadedBy: session.user.id,
          sourceUploadId: upload.id,
        })
        .returning();

      previewQuestions.push({
        id: inserted.id,
        stem: inserted.stem,
        difficulty: inserted.difficulty,
        options: inserted.options,
        correctKey: inserted.correctKey,
        explanation: inserted.explanation,
      });
      questionsExtracted++;
    }
  }

  await db
    .update(uploads)
    .set({
      processed: true,
      extractedText,
      processingNotes:
        uploadType === "question_bank"
          ? `${questionsExtracted} questions extracted`
          : `Study material saved. ${extractedText ? "Text extracted for targeted remediation." : "No text could be extracted."}`,
    })
    .where(eq(uploads.id, upload.id));

  return NextResponse.json({
    success: true,
    message:
      uploadType === "question_bank"
        ? `${questionsExtracted} questions extracted and added`
        : "Study material uploaded and indexed for targeted remediation",
    questionsExtracted: uploadType === "question_bank" ? questionsExtracted : undefined,
    uploadId: upload.id,
    storagePath: upload.storagePath,
    fileFormat: format,
    originalName: file.name,
    notesIndexed: uploadType === "study_material",
    previewQuestions,
  });
}
