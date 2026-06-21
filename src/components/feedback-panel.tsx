"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { MathRenderer } from "@/components/math-renderer";

export function FeedbackPanel({
  isCorrect,
  explanation,
  aiDiagnosis,
  canRetry,
  onRetry,
  onContinue,
}: {
  isCorrect: boolean;
  explanation?: string | null;
  aiDiagnosis?: string | null;
  canRetry?: boolean;
  onRetry?: () => void;
  onContinue?: () => void;
}) {
  return (
    <aside className="rounded-xl border border-[#1E1E30] bg-[#141420] p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold text-[#F1F1F5]">
        {isCorrect ? <CheckCircle2 className="text-[#22C55E]" /> : <XCircle className="text-[#EF4444]" />}
        {isCorrect ? "Correct" : "Not quite"}
      </div>
      <div className="text-sm leading-6 text-[#B8BBC7]">
        <MathRenderer text={isCorrect ? explanation ?? "Good work." : aiDiagnosis ?? "Review the idea and try again."} />
      </div>
      <div className="mt-4 flex gap-3">
        {!isCorrect && canRetry && (
          <button className="rounded-lg bg-[#7C6FFF] px-4 py-2 text-sm font-semibold text-white" onClick={onRetry}>
            Retry
          </button>
        )}
        <button className="rounded-lg border border-[#1E1E30] px-4 py-2 text-sm font-semibold text-[#F1F1F5]" onClick={onContinue}>
          Continue
        </button>
      </div>
    </aside>
  );
}
