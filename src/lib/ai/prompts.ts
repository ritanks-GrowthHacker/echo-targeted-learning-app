import type { QuestionOption } from "@/lib/db/schema";

export function diagnosisPrompt({
  questionStem,
  options,
  selectedKey,
  correctKey,
}: {
  questionStem: string;
  options: Pick<QuestionOption, "key" | "text">[];
  selectedKey: string;
  correctKey: string;
}) {
  return `You are an expert JEE Physics tutor. A student answered a Kinematics question incorrectly.

QUESTION: ${questionStem}
OPTIONS:
${options.map((o) => `${o.key}. ${o.text}`).join("\n")}
STUDENT CHOSE: ${selectedKey}
CORRECT ANSWER: ${correctKey}

In 2 sentences: explain the specific misconception that caused this error, then state the key idea to remember.
Address the student as "you". Physics vocabulary only. No preamble.`;
}

export function extractionPrompt(text: string, conceptSlug: string) {
  return `You are an expert JEE/NEET Physics question-bank parser.

Parse this physics text and extract all MCQ questions for the Kinematics concept: ${conceptSlug}.

For every question:
- Infer the correct answer from an answer key, explanation, or by solving the physics yourself.
- Infer difficulty as:
  easy = direct definition or one-step substitution
  medium = two-step calculation, graph interpretation, or sign convention
  hard = multi-concept reasoning, tricky frame/sign issue, or algebra-heavy projectile/relative motion
- Preserve equations in LaTeX using $...$ inline and $$...$$ display.
- Return exactly 4 options per question.
- Do not return a question if you cannot determine the correct option.

TEXT:
${text}

Return ONLY a JSON array - no markdown, no preamble:
[{
  "stem": "question text (LaTeX: $...$ inline, $$...$$ display)",
  "difficulty": "easy | medium | hard",
  "options": [
    { "key": "A", "text": "..." },
    { "key": "B", "text": "..." },
    { "key": "C", "text": "..." },
    { "key": "D", "text": "..." }
  ],
  "correct_key": "A",
  "explanation": "why this is correct"
}]`;
}

export function targetedNotesPrompt({
  notesText,
  weakContext,
}: {
  notesText: string;
  weakContext: string;
}) {
  return `You are a JEE/NEET Physics remediation tutor.

The student answered these questions incorrectly:
${weakContext}

From the uploaded teacher notes below, extract ONLY the paragraphs/formulas/examples needed to revise the concepts behind those mistakes.

Rules:
- Do not summarize the whole chapter.
- Do not show unrelated notes.
- Keep it concise but useful.
- Use headings and bullet points.
- Preserve equations in LaTeX where present.
- If the exact concept is not present in notes, say what is missing and give the closest relevant section.

UPLOADED NOTES:
${notesText.slice(0, 24000)}`;
}
