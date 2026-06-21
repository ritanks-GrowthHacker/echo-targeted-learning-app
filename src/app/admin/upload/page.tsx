"use client";

import { useEffect, useState } from "react";
import { FileUploader } from "@/components/file-uploader";
import { MathRenderer } from "@/components/math-renderer";

type Concept = { id: string; title: string };
type UploadResult = {
  success: boolean;
  error?: string;
  message?: string;
  questionsExtracted?: number;
  storagePath?: string;
  originalName?: string;
  notesIndexed?: boolean;
  previewQuestions?: Array<{
    id: string;
    stem: string;
    difficulty: "easy" | "medium" | "hard";
    options: Array<{ key: string; text: string }>;
    correctKey: string;
    explanation: string | null;
  }>;
};

function UploadForm({ type, title }: { type: "question_bank" | "study_material"; title: string }) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/concepts").then((res) => res.json()).then(setConcepts);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setMessage(type === "question_bank" ? "Processing question bank..." : "Processing study material...");
    setResult(null);

    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const formData = new FormData(form);
      formData.set("upload_type", type);
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({
        success: false,
        error: `Upload failed with HTTP ${response.status}`,
      }));
      setResult(data);
      setMessage(data.success ? data.message ?? "Upload complete" : data.error ?? "Upload failed");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="relative rounded-xl border border-[#1E1E30] bg-[#141420] p-6">
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0D0D14]/95 px-4 text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#1E1E30] border-t-[#7C6FFF]" />
          <p className="mt-5 text-xl font-semibold text-[#F1F1F5]">
            {type === "question_bank" ? "Processing question bank" : "Processing study material"}
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#B8BBC7]">
            {type === "question_bank"
              ? "Extracting questions, detecting answers and difficulty, then saving them to the database."
              : "Extracting note text so students only see the relevant literature for their weak concepts."}
          </p>
          <p className="mt-4 text-xs text-[#6B7280]">Keep this tab open.</p>
        </div>
      )}
      <h2 className="text-xl font-semibold">{title}</h2>
      <select name="concept_id" className="mt-5 w-full rounded-lg border border-[#1E1E30] bg-[#0D0D14] px-4 py-3" required>
        {concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.title}</option>)}
      </select>
      <div className="mt-4"><FileUploader /></div>
      <button disabled={submitting} className="mt-5 rounded-lg bg-[#7C6FFF] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? "Processing..." : "Upload"}
      </button>
      {message && (
        <p className={`mt-3 text-sm ${result?.success === false ? "text-[#EF4444]" : "text-[#B8BBC7]"}`}>
          {message}
        </p>
      )}
      {result?.storagePath && type === "study_material" && (
        <div className="mt-3 rounded-lg border border-[#22C55E]/30 bg-[#12301f] p-3">
          <p className="text-sm font-semibold text-[#86EFAC]">Notes indexed for this topic.</p>
          <p className="mt-1 text-xs text-[#B8BBC7]">
            Students will see only targeted excerpts after weak-area analysis, not the whole notes.
          </p>
          {result.storagePath.startsWith("/uploads/") && (
            <a className="mt-2 inline-flex text-sm font-semibold text-[#7C6FFF]" href={result.storagePath} target="_blank">
              Open uploaded material
            </a>
          )}
        </div>
      )}
      {type === "question_bank" && result?.previewQuestions && result.previewQuestions.length > 0 && (
        <section className="mt-5 rounded-xl border border-[#1E1E30] bg-[#0D0D14] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Extracted question preview</h3>
            <span className="text-xs text-[#6B7280]">{result.previewQuestions.length} saved</span>
          </div>
          <div className="max-h-[520px] space-y-4 overflow-auto pr-2">
            {result.previewQuestions.map((question, index) => (
              <article key={question.id} className="rounded-lg border border-[#1E1E30] bg-[#141420] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[#7C6FFF]/20 px-2 py-1 font-semibold text-[#B8B2FF]">Q{index + 1}</span>
                  <span className="rounded-full bg-[#1E1E30] px-2 py-1 font-semibold capitalize">{question.difficulty}</span>
                  <span className="rounded-full bg-[#22C55E]/15 px-2 py-1 font-semibold text-[#86EFAC]">Correct: {question.correctKey}</span>
                </div>
                <div className="text-sm font-medium leading-6 text-[#F1F1F5]">
                  <MathRenderer text={question.stem} />
                </div>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => (
                    <div
                      key={option.key}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        option.key === question.correctKey
                          ? "border-[#22C55E] bg-[#12301f] text-[#DCFCE7]"
                          : "border-[#1E1E30] bg-[#0D0D14] text-[#B8BBC7]"
                      }`}
                    >
                      <span className="mr-2 font-semibold">{option.key}.</span>{option.text}
                    </div>
                  ))}
                </div>
                {question.explanation && <p className="mt-3 text-sm leading-6 text-[#B8BBC7]">{question.explanation}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </form>
  );
}

export default function AdminUploadPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-semibold">Upload</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <UploadForm type="question_bank" title="Question Bank Upload" />
        <UploadForm type="study_material" title="Study Material Upload" />
      </div>
    </main>
  );
}
