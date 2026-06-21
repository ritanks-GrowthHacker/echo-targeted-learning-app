"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConceptStatusBadge } from "@/components/concept-status-badge";

type ProgressRow = {
  concept: { id: string; title: string; description: string | null };
  mastery: { status: "weak" | "building" | "strong"; masteryScore: string } | null;
};

export default function PracticePage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch("/api/progress")
      .then((res) => res.json())
      .then((rows) => {
        setProgress(rows);
        setSelectedConceptId(rows[0]?.concept.id ?? "");
      });
  }, []);

  async function start() {
    if (!selectedConceptId) return;
    setStarting(true);
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId: selectedConceptId }),
    });
    const data = await response.json();
    router.push(`/session/${data.sessionId}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Practice Test</h1>
        <p className="mt-2 text-[#6B7280]">Select a chapter, answer 10 questions, then review only the notes for concepts you missed.</p>
      </div>

      <section className="rounded-xl border border-[#1E1E30] bg-[#141420] p-5">
        <label className="text-sm font-semibold text-[#B8BBC7]">Chapter / Concept</label>
        <select
          value={selectedConceptId}
          onChange={(event) => setSelectedConceptId(event.target.value)}
          className="mt-3 w-full rounded-lg border border-[#1E1E30] bg-[#0D0D14] px-4 py-3 text-[#F1F1F5]"
        >
          {progress.map((row) => (
            <option key={row.concept.id} value={row.concept.id}>
              {row.concept.title}
            </option>
          ))}
        </select>
        <button
          onClick={start}
          disabled={!selectedConceptId || starting}
          className="mt-5 rounded-lg bg-[#7C6FFF] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {starting ? "Starting..." : "Start 10 Question Test"}
        </button>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {progress.map((row) => (
          <button
            key={row.concept.id}
            onClick={() => setSelectedConceptId(row.concept.id)}
            className={`flex items-center justify-between rounded-xl border p-4 text-left ${
              selectedConceptId === row.concept.id ? "border-[#7C6FFF] bg-[#1A1A28]" : "border-[#1E1E30] bg-[#141420]"
            }`}
          >
            <span className="font-medium">{row.concept.title}</span>
            <ConceptStatusBadge status={row.mastery?.status} />
          </button>
        ))}
      </div>
    </main>
  );
}
