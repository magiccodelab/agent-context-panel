import { Gauge } from "lucide-react";
import type { Session, SessionStats, TokenUsage } from "../data/mock";
import { formatInt, formatPercent } from "../lib/format";
import { cx } from "./ui";

const SEGMENTS: { key: keyof TokenUsage; label: string; swatch: string }[] = [
  { key: "cacheRead", label: "缓存读取", swatch: "bg-accent" },
  { key: "input", label: "新输入", swatch: "bg-fg" },
  { key: "output", label: "输出", swatch: "bg-fg-2" },
  { key: "reasoning", label: "推理", swatch: "bg-fg-3" },
  { key: "cacheWrite", label: "缓存写入", swatch: "bg-line" },
];

export function ContextUsageCard({ session, stats }: { session: Session; stats: SessionStats }) {
  const { contextTotal, lastUsage, usage, remaining, estimatedRemainingMessages } = stats;
  const isCritical = usage >= 0.9;

  return (
    <section aria-labelledby="ctx-usage-title" className="rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ctx-usage-title" className="flex items-center gap-2 text-body-sm font-medium text-fg">
          <Gauge className="size-4 text-fg-3" strokeWidth={1.75} aria-hidden />
          上下文窗口
        </h2>
        <p className="text-caption text-fg-2">
          剩余 <span className="tabular-nums text-fg">{formatInt(remaining)}</span>
          {Number.isFinite(estimatedRemainingMessages) && (
            <>
              {" "}
              · 按近期增速约可再处理 <span className="tabular-nums text-fg">{formatInt(estimatedRemainingMessages)}</span> 条消息
            </>
          )}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span className={cx("text-h1 font-semibold tabular-nums", isCritical ? "text-danger" : "text-fg")}>{formatPercent(usage)}</span>
          <span className="text-body-sm text-fg-2">已使用</span>
        </div>
        <p className="text-body-sm tabular-nums text-fg-2">
          <span className="font-medium text-fg">{formatInt(contextTotal)}</span>
          <span className="text-fg-2"> / {formatInt(session.contextLimit)} 词元</span>
        </p>
      </div>

      <div
        role="meter"
        aria-label="上下文使用率"
        aria-valuemin={0}
        aria-valuemax={session.contextLimit}
        aria-valuenow={contextTotal}
        aria-valuetext={`${formatPercent(usage)}，${formatInt(contextTotal)} / ${formatInt(session.contextLimit)} 词元`}
        className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-2"
      >
        {SEGMENTS.map(({ key, swatch }) => {
          const value = lastUsage[key];
          if (value <= 0 || session.contextLimit <= 0) return null;
          return <span key={key} className={cx("h-full min-w-[2px]", swatch)} style={{ width: `${(value / session.contextLimit) * 100}%` }} />;
        })}
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-caption text-fg-2">最近一次请求构成</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-5">
          {SEGMENTS.map(({ key, label, swatch }) => {
            const value = lastUsage[key];
            return (
              <div key={key} className="min-w-0">
                <dt className="flex items-center gap-2 text-caption text-fg-2">
                  <span className={cx("size-2 shrink-0 rounded-full", swatch, key === "cacheWrite" && "ring-1 ring-fg-3 ring-inset")} aria-hidden />
                  {label}
                </dt>
                <dd className="mt-1 flex items-baseline gap-2 pl-4">
                  <span className="text-body-sm font-medium tabular-nums text-fg">{formatInt(value)}</span>
                  <span className="text-caption tabular-nums text-fg-2">{contextTotal > 0 ? formatPercent(value / contextTotal) : "—"}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
