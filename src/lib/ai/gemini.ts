import { GoogleGenerativeAI } from "@google/generative-ai";
import { diagnosisPrompt, extractionPrompt, targetedNotesPrompt } from "@/lib/ai/prompts";
import type { QuestionOption } from "@/lib/db/schema";
import { parseLocalMCQs } from "@/lib/ai/local-mcq-parser";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY ?? "");

export const flash = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
});

const extractionModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
});

export async function diagnoseMisconception({
  questionStem,
  options,
  selectedKey,
  correctKey,
}: {
  questionStem: string;
  options: QuestionOption[];
  selectedKey: string;
  correctKey: string;
}) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return "Review the concept explanation below carefully before trying again.";
  }

  try {
    const result = await flash.generateContent(
      diagnosisPrompt({ questionStem, options, selectedKey, correctKey }),
    );
    return result.response.text();
  } catch {
    return "Review the concept explanation below carefully before trying again.";
  }
}

export async function extractMCQFromText(text: string, conceptSlug: string) {
  const chunks = chunkQuestionText(text, 10);
  const all: ExtractedMCQ[] = [];

  for (const chunk of chunks.slice(0, 12)) {
    try {
      const result = await extractionModel.generateContent(extractionPrompt(chunk, conceptSlug));
      const raw = result.response.text();
      all.push(...parseJsonArray(raw));
    } catch {
      const localQuestions = parseLocalMCQs(chunk);
      for (const question of localQuestions) {
        const solved = await solveLocalQuestion(question, conceptSlug);
        if (solved) all.push(solved);
      }
    }
  }

  return all;
}

type ExtractedMCQ = {
    stem: string;
    difficulty: "easy" | "medium" | "hard";
    options: Array<{ key: "A" | "B" | "C" | "D"; text: string }>;
    correct_key: string;
    explanation?: string;
};

function chunkQuestionText(text: string, questionsPerChunk: number) {
  const matches = Array.from(text.matchAll(/(?:^|\n)(Q\d+\.[\s\S]*?)(?=\nQ\d+\.|\n[A-Z][A-Za-z &,'()-]+\(Q\d+|$)/g));
  const questionBlocks = matches.map((match) => match[1].trim()).filter(Boolean);

  if (!questionBlocks.length) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < questionBlocks.length; i += questionsPerChunk) {
    chunks.push(questionBlocks.slice(i, i + questionsPerChunk).join("\n\n"));
  }
  return chunks;
}

function parseJsonArray(raw: string) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Gemini did not return a JSON array: ${cleaned.slice(0, 300)}`);
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as ExtractedMCQ[];
}

async function solveLocalQuestion(
  question: { stem: string; options: Array<{ key: "A" | "B" | "C" | "D"; text: string }> },
  conceptSlug: string,
): Promise<ExtractedMCQ | null> {
  try {
    const result = await extractionModel.generateContent(`You are an expert JEE/NEET Physics tutor.
Solve this ${conceptSlug} MCQ and classify its difficulty.

QUESTION: ${question.stem}
OPTIONS:
${question.options.map((option) => `${option.key}. ${option.text}`).join("\n")}

Return ONLY this JSON object:
{
  "correct_key": "A|B|C|D",
  "difficulty": "easy|medium|hard",
  "explanation": "one short reason"
}`);
    const raw = result.response.text().replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const solved = JSON.parse(raw.slice(start, end + 1)) as {
      correct_key?: string;
      difficulty?: "easy" | "medium" | "hard";
      explanation?: string;
    };
    const correctKey = String(solved.correct_key ?? "").toUpperCase();
    if (!["A", "B", "C", "D"].includes(correctKey)) return null;
    if (!["easy", "medium", "hard"].includes(String(solved.difficulty))) return null;
    return {
      stem: question.stem,
      options: question.options,
      correct_key: correctKey,
      difficulty: solved.difficulty!,
      explanation: solved.explanation ?? "Solved by Gemini.",
    };
  } catch {
    return null;
  }
}

export async function extractTextFromImage(bytes: Buffer, mimeType: string) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) return "";
  const result = await flash.generateContent([
    "Extract the visible JEE/NEET Physics MCQ text from this image. Preserve equations in LaTeX when possible.",
    { inlineData: { data: bytes.toString("base64"), mimeType } },
  ]);
  return result.response.text();
}

export async function selectTargetedNotes({
  notesText,
  weakContext,
}: {
  notesText: string;
  weakContext: string;
}) {
  if (!process.env.GOOGLE_GEMINI_API_KEY || !notesText.trim()) {
    return fallbackNotes(notesText, weakContext);
  }

  try {
    const result = await extractionModel.generateContent(targetedNotesPrompt({ notesText, weakContext }));
    const text = result.response.text().trim();
    return text || fallbackNotes(notesText, weakContext);
  } catch {
    return fallbackNotes(notesText, weakContext);
  }
}

function fallbackNotes(notesText: string, weakContext: string) {
  const terms = Array.from(
    new Set(
      weakContext
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 4),
    ),
  ).slice(0, 20);

  const paragraphs = notesText
    .split(/\n{2,}|\r\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const scored = paragraphs
    .map((paragraph) => ({
      paragraph,
      score: terms.reduce((sum, term) => sum + (paragraph.toLowerCase().includes(term) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.paragraph);

  return scored.length
    ? scored.join("\n\n")
    : notesText.slice(0, 1800) || "No matching uploaded notes were found for this weak area.";
}
