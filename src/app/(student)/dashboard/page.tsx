"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConceptStatusBadge } from "@/components/concept-status-badge";

type Overview = {
  name?: string | null;
  overallMastery: number;
  conceptsTotal: number;
  strongCount: number;
  nextRecommended: null | { id: string; title: string; status: "weak" | "building" | "strong"; score: number; attempts: number };
  weak: Array<{ id: string; title: string; status: "weak" | "building" | "strong"; score: number; attempts: number }>;
  activeSession?: null | { id: string; attempts: number; correct: number | null };
  recentAttempts: Array<{
    id: string;
    selectedKey: string;
    isCorrect: boolean;
    phase: string;
    attemptedAt: string;
    stem: string;
    correctKey: string;
    conceptTitle: string;
  }>;
  sessions: Array<{ id: string; attempts: number; correct: number | null; startedAt: string }>;
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/student/overview").then((res) => res.json()).then(setOverview);
  }, []);

  if (!overview) {
    return (
      <main className="grid min-h-[70vh] place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#1E1E30] border-t-[#7C6FFF]" />
          <p className="mt-4 text-[#B8BBC7]">Loading your learning tracker...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">Your Kinematics Tracker</h1>
          <p className="mt-2 text-[#6B7280]">Welcome{overview.name ? `, ${overview.name}` : ""}. Track what you are doing, where you stand, and what to revise next.</p>
        </div>
        <Link className="rounded-lg bg-[#7C6FFF] px-4 py-3 text-sm font-semibold text-white" href="/practice">
          Start Practice
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#1E1E30] bg-[#141420] p-5">
          <p className="text-sm text-[#6B7280]">Overall mastery</p>
          <p className="mt-2 text-3xl font-semibold">{overview.overallMastery}%</p>
        </div>
        <div className="rounded-xl border border-[#1E1E30] bg-[#141420] p-5">
          <p className="text-sm text-[#6B7280]">Strong concepts</p>
          <p className="mt-2 text-3xl font-semibold">{overview.strongCount}/{overview.conceptsTotal}</p>
        </div>
        <div className="rounded-xl border border-[#1E1E30] bg-[#141420] p-5">
          <p className="text-sm text-[#6B7280]">Weak/building</p>
          <p className="mt-2 text-3xl font-semibold">{overview.weak.length}</p>
        </div>
        <div className="rounded-xl border border-[#1E1E30] bg-[#141420] p-5">
          <p className="text-sm text-[#6B7280]">Current state</p>
          <p className="mt-2 text-lg font-semibold">{overview.activeSession ? "Test in progress" : "Ready for practice"}</p>
        </div>
      </section>

      {overview.activeSession && (
        <section className="mt-6 rounded-xl border border-[#7C6FFF] bg-[#141420] p-5">
          <p className="text-sm text-[#B8BBC7]">You have an unfinished 10-question test.</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">{overview.activeSession.attempts}/10 answered</p>
            <Link className="rounded-lg bg-[#7C6FFF] px-4 py-2 font-semibold text-white" href={`/session/${overview.activeSession.id}`}>
              Continue test
            </Link>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl border border-[#1E1E30] bg-[#141420] p-5">
          <h2 className="text-xl font-semibold">Recommended Next</h2>
          {overview.nextRecommended ? (
            <div className="mt-4 rounded-lg bg-[#0D0D14] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{overview.nextRecommended.title}</h3>
                <ConceptStatusBadge status={overview.nextRecommended.status} />
              </div>
              <p className="mt-2 text-sm text-[#6B7280]">Mastery {overview.nextRecommended.score}% · {overview.nextRecommended.attempts} attempts</p>
              <Link className="mt-4 inline-flex rounded-lg bg-[#7C6FFF] px-4 py-2 text-sm font-semibold text-white" href="/practice">
                Practice this topic
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-[#B8BBC7]">All concepts are strong. Keep revising with mixed practice.</p>
          )}
        </div>

        <div className="rounded-xl border border-[#1E1E30] bg-[#141420] p-5">
          <h2 className="text-xl font-semibold">Weak Area Map</h2>
          <div className="mt-4 space-y-3">
            {overview.weak.map((item) => (
              <div key={item.id} className="rounded-lg bg-[#0D0D14] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.title}</span>
                  <ConceptStatusBadge status={item.status} />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#1E1E30]">
                  <div className="h-full bg-[#7C6FFF]" style={{ width: `${item.score}%` }} />
                </div>
                <p className="mt-2 text-xs text-[#6B7280]">Mastery {item.score}% · Attempts {item.attempts}</p>
              </div>
            ))}
            {!overview.weak.length && <p className="text-[#B8BBC7]">No weak concepts right now.</p>}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-[#1E1E30] bg-[#141420] p-5">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        <div className="mt-4 space-y-3">
          {overview.recentAttempts.map((attempt) => (
            <div key={attempt.id} className="rounded-lg bg-[#0D0D14] p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">{attempt.conceptTitle}</span>
                <span className={attempt.isCorrect ? "text-[#22C55E]" : "text-[#EF4444]"}>
                  {attempt.isCorrect ? "Correct" : `Wrong · correct ${attempt.correctKey}`}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[#B8BBC7]">{attempt.stem}</p>
            </div>
          ))}
          {!overview.recentAttempts.length && <p className="text-[#B8BBC7]">No attempts yet. Start your first 10-question test.</p>}
        </div>
      </section>
    </main>
  );
}
