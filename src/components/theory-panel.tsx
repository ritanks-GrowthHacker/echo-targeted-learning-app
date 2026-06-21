"use client";

import { BookOpenCheck } from "lucide-react";
import { MathRenderer } from "@/components/math-renderer";

export function TheoryPanel({
  title,
  remediation,
  workedExample,
  onReady,
}: {
  title: string;
  remediation: string;
  workedExample?: string | null;
  onReady: () => void;
}) {
  return (
    <section className="rounded-xl border border-[#1E1E30] bg-[#141420] p-6">
      <div className="mb-4 flex items-center gap-3 text-xl font-semibold text-[#F1F1F5]">
        <BookOpenCheck className="text-[#7C6FFF]" />
        {title}
      </div>
      <p className="text-sm leading-6 text-[#B8BBC7]">{remediation}</p>
      {workedExample && (
        <div className="mt-4 rounded-lg border border-[#1E1E30] bg-[#0D0D14] p-4 text-sm text-[#F1F1F5]">
          <MathRenderer text={workedExample} />
        </div>
      )}
      <button className="mt-5 rounded-lg bg-[#7C6FFF] px-4 py-2 text-sm font-semibold text-white" onClick={onReady}>
        I understand, test me
      </button>
    </section>
  );
}
