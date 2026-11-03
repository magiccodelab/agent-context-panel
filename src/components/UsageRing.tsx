import { cx } from "./ui";

/** 小型环形用量指示，接近上限时转为危险色 */
export function UsageRing({ ratio, size = 16, className }: { ratio: number; size?: number; className?: string }) {
  const stroke = 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, ratio));
  const isCritical = clamped >= 0.9;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cx("-rotate-90 shrink-0", className)} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-2 dark:stroke-line" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        className={isCritical ? "stroke-danger" : "stroke-accent"}
      />
    </svg>
  );
}
