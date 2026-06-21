import { percent, toNumber } from "@/lib/utils";

export function ProgressRing({ score, size = 72 }: { score?: string | number | null; size?: number }) {
  const value = toNumber(score);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = value >= 0.75 ? "#22C55E" : value >= 0.4 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1E1E30" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value)}
        />
      </svg>
      <span className="absolute text-sm font-semibold text-[#F1F1F5]">{percent(score)}%</span>
    </div>
  );
}
