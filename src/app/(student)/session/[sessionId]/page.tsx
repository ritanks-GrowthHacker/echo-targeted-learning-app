"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { QuestionCard, type ClientQuestion } from "@/components/question-card";
import { FeedbackPanel } from "@/components/feedback-panel";
import { MathRenderer } from "@/components/math-renderer";

type AnswerResult = {
  isCorrect: boolean;
  correctKey: string;
  explanation?: string;
  aiDiagnosis?: string;
};

type Report = {
  concept: { title: string };
  total: number;
  correct: number;
  wrong: number;
  scorePercent: number;
  status: "needs_review" | "strong";
  wrongQuestions: Array<{
    questionId: string;
    stem: string;
    selectedKey: string;
    correctKey: string;
    explanation: string | null;
    aiDiagnosis: string | null;
  }>;
  remediation: Array<{
    id: string;
    description: string;
    remediationText: string;
    workedExample: string | null;
  }>;
  materials: Array<{ id: string; name: string; url: string; type: string; excerpt: string }>;
};

export default function SessionPage({ params }: { params: { sessionId: string } }) {
  const [question, setQuestion] = useState<ClientQuestion | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>();
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [answered, setAnswered] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"practice" | "retest">("practice");

  async function loadNext(nextPhase: "practice" | "retest" = phase) {
    setLoading(true);
    setSelectedKey(undefined);
    setResult(null);
    const response = await fetch(`/api/sessions/${params.sessionId}/next?phase=${nextPhase}`);
    const data = await response.json();
    if (data.complete || !data.question) {
      await loadReport(nextPhase);
      return;
    }
    setAnswered(data.answered ?? answered);
    setQuestion(data.question);
    setLoading(false);
  }

  async function loadReport(reportPhase = phase) {
    const response = await fetch(`/api/sessions/${params.sessionId}/report?phase=${reportPhase}`);
    const data = await response.json();
    setReport(data);
    setQuestion(null);
    setLoading(false);
  }

  useEffect(() => {
    loadNext("practice");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = useCallback(
    async (key: string) => {
      if (!question) return;
      setSelectedKey(key);
      const response = await fetch(`/api/sessions/${params.sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, selectedKey: key, phase }),
      });
      const data = await response.json();
      setResult(data);
      setAnswered((count) => count + 1);
    },
    [params.sessionId, phase, question],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!question || result || loading || report) return;
      const key = event.key.toLowerCase();
      const map: Record<string, string> = {
        a: "A",
        b: "B",
        c: "C",
        d: "D",
        "1": "A",
        "2": "B",
        "3": "C",
        "4": "D",
      };
      const selected = map[key];
      if (!selected) return;
      event.preventDefault();
      answer(selected);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answer, question, result, loading, report, phase]);

  function startRetest() {
    setPhase("retest");
    setReport(null);
    setQuestion(null);
    setAnswered(0);
    setSelectedKey(undefined);
    setResult(null);
    loadNext("retest");
  }

  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#1E1E30] border-t-[#7C6FFF]" />
          <p className="mt-4 text-[#B8BBC7]">Preparing your practice test...</p>
        </div>
      </main>
    );
  }

  if (report) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-xl border border-[#1E1E30] bg-[#141420] p-6">
          <h1 className="text-2xl font-semibold">{report.concept.title} {phase === "retest" ? "Retest" : "Report"}</h1>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-[#0D0D14] p-4"><p className="text-sm text-[#6B7280]">Score</p><p className="text-2xl font-semibold">{report.scorePercent}%</p></div>
            <div className="rounded-lg bg-[#0D0D14] p-4"><p className="text-sm text-[#6B7280]">Correct</p><p className="text-2xl font-semibold text-[#22C55E]">{report.correct}</p></div>
            <div className="rounded-lg bg-[#0D0D14] p-4"><p className="text-sm text-[#6B7280]">Wrong</p><p className="text-2xl font-semibold text-[#EF4444]">{report.wrong}</p></div>
            <div className="rounded-lg bg-[#0D0D14] p-4"><p className="text-sm text-[#6B7280]">Total</p><p className="text-2xl font-semibold">{report.total}</p></div>
          </div>
        </section>

        {report.status === "strong" ? (
          <section className="mt-6 rounded-xl border border-[#1E1E30] bg-[#141420] p-6">
            <h2 className="text-xl font-semibold text-[#22C55E]">Strong concept</h2>
            <p className="mt-2 text-[#B8BBC7]">No remediation notes needed for this set.</p>
          </section>
        ) : (
          <section className="mt-6 rounded-xl border border-[#1E1E30] bg-[#141420] p-6">
            <h2 className="text-xl font-semibold">Notes for your weak areas</h2>
            <p className="mt-2 text-sm text-[#6B7280]">Only notes/remediation for this missed concept are shown.</p>
            <div className="mt-5 space-y-4">
              {report.remediation.map((item) => (
                <article key={item.id} className="rounded-lg border border-[#1E1E30] bg-[#0D0D14] p-4">
                  <h3 className="font-semibold">{item.description}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#B8BBC7]">{item.remediationText}</p>
                  {item.workedExample && <div className="mt-3 text-sm text-[#F1F1F5]"><MathRenderer text={item.workedExample} /></div>}
                </article>
              ))}
              {report.materials.map((material) => (
                <article key={material.id} className="rounded-lg border border-[#7C6FFF] bg-[#0D0D14] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-[#B8B2FF]">Targeted notes from {material.name}</h3>
                    <a href={material.url} target="_blank" className="text-sm font-semibold text-[#7C6FFF]">Open full file</a>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#F1F1F5]">
                    <MathRenderer text={material.excerpt} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {report.wrongQuestions.length > 0 && (
          <section className="mt-6 rounded-xl border border-[#1E1E30] bg-[#141420] p-6">
            <h2 className="text-xl font-semibold">Mistake review</h2>
            <div className="mt-4 space-y-3">
              {report.wrongQuestions.map((item) => (
                <details key={item.questionId} className="rounded-lg bg-[#0D0D14] p-4">
                  <summary className="cursor-pointer"><MathRenderer text={item.stem} /></summary>
                  <p className="mt-3 text-sm text-[#B8BBC7]">You chose {item.selectedKey}. Correct answer: {item.correctKey}.</p>
                  {item.explanation && <p className="mt-2 text-sm text-[#B8BBC7]">{item.explanation}</p>}
                </details>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {report.status === "needs_review" && (
            <button onClick={startRetest} className="rounded-lg bg-[#7C6FFF] px-4 py-3 font-semibold text-white">
              I revised, start another 10 questions
            </button>
          )}
          <Link className="inline-flex rounded-lg border border-[#1E1E30] px-4 py-3 font-semibold text-[#F1F1F5]" href="/practice">
            Practice another chapter
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-5">
        <div className="mb-2 flex justify-between text-sm text-[#B8BBC7]">
          <span>{phase === "retest" ? "Retest After Revision" : "Practice Test"}</span>
          <span>Question {Math.min(answered + 1, 10)} of 10</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#1E1E30]">
          <div className="h-full bg-[#7C6FFF]" style={{ width: `${(answered / 10) * 100}%` }} />
        </div>
      </div>
      <p className="mb-4 text-xs text-[#6B7280]">Use keyboard: A/B/C/D or 1/2/3/4 to answer.</p>
      {question && <QuestionCard question={question} selectedKey={selectedKey} correctKey={result?.correctKey} disabled={Boolean(result)} onAnswer={answer} />}
      {result && <div className="mt-4"><FeedbackPanel {...result} onContinue={() => loadNext()} /></div>}
    </main>
  );
}
