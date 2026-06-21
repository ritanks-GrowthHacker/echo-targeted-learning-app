"use client";

import { OptionButton } from "@/components/option-button";
import { MathRenderer } from "@/components/math-renderer";

export type ClientQuestion = {
  id: string;
  stem: string;
  correctKey?: string;
  options: Array<{ key: string; text: string; misconception_id?: string | null }>;
};

export function QuestionCard({
  question,
  selectedKey,
  correctKey,
  disabled,
  onAnswer,
}: {
  question: ClientQuestion;
  selectedKey?: string;
  correctKey?: string;
  disabled?: boolean;
  onAnswer: (key: string) => void;
}) {
  return (
    <section className="rounded-xl border border-[#1E1E30] bg-[#141420] p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 text-lg font-semibold leading-7 text-[#F1F1F5]">
        <MathRenderer text={question.stem} />
      </div>
      <div className="space-y-3">
        {question.options.map((option) => (
          <OptionButton
            key={option.key}
            option={option}
            disabled={disabled}
            reveal={Boolean(correctKey)}
            isSelected={selectedKey === option.key}
            isCorrect={correctKey === option.key}
            onClick={() => onAnswer(option.key)}
          />
        ))}
      </div>
    </section>
  );
}
