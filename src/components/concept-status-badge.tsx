import { cn } from "@/lib/utils";

export function ConceptStatusBadge({ status }: { status?: "weak" | "building" | "strong" | null }) {
  const value = status ?? "weak";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize",
        value === "weak" && "bg-[#EF4444]/15 text-[#FCA5A5]",
        value === "building" && "bg-[#F59E0B]/15 text-[#FCD34D]",
        value === "strong" && "bg-[#22C55E]/15 text-[#86EFAC]",
      )}
    >
      {value}
    </span>
  );
}
