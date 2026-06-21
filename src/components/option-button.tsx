"use client";

import { cn } from "@/lib/utils";

export function OptionButton({
  option,
  disabled,
  isSelected,
  isCorrect,
  reveal,
  onClick,
}: {
  option: { key: string; text: string };
  disabled?: boolean;
  isSelected?: boolean;
  isCorrect?: boolean;
  reveal?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-[#1E1E30] bg-[#0D0D14] p-4 text-left text-sm text-[#F1F1F5] transition",
        "hover:border-[#7C6FFF] disabled:cursor-not-allowed",
        reveal && isCorrect && "border-[#22C55E] bg-[#12301f]",
        reveal && isSelected && !isCorrect && "border-[#EF4444] bg-[#331619]",
      )}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#1E1E30] font-semibold">
        {option.key}
      </span>
      <span>{option.text}</span>
    </button>
  );
}
