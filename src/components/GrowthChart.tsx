import { TrendingUp } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { Message, Turn } from "../data/mock";
import { useI18n } from "../i18n/I18nProvider";
import { niceCeil } from "../lib/format";
import { cx, Segmented, SectionTitle } from "./ui";

type Mode = "context" | "output";

const HEIGHT = 192;
const PAD = { left: 44, right: 8, top: 28, bottom: 24 };

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  // 先同步测量一次，首帧即可绘制图表；ResizeObserver 的回调依赖渲染帧，后台标签页中会延迟触发
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

interface GrowthChartProps {
  /** 仅助手消息，按时间顺序 */
  points: Message[];
  turns: Turn[];
  contextLimit: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function GrowthChart({ points, turns, contextLimit, selectedId, onSelect }: GrowthChartProps) {
  const { t, f } = useI18n();
  const [mode, setMode] = useState<Mode>("context");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [containerRef, width] = useElementWidth<HTMLDivElement>();

  const n = points.length;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const values = useMemo(
    () => points.map((p) => (mode === "context" ? (p.contextTotal ?? 0) : (p.tokens?.output ?? 0) + (p.tokens?.reasoning ?? 0))),
    [points, mode],
  );
  const yMax = niceCeil(Math.max(1, ...values));
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  const turnStarts = useMemo(() => {
    return turns
      .map((turn) => ({ turn: turn.index, index: points.findIndex((p) => p.turn === turn.index), at: turn.startedAt }))
      .filter((start) => start.index >= 0);
  }, [turns, points]);

  const selectedIndex = selectedId ? points.findIndex((p) => p.id === selectedId) : -1;

  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const areaPath = n > 0 ? `${linePath}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : "";
  const barWidth = Math.max(1, plotW / Math.max(1, n) - 1);

  const indexFromPointer = (e: MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / Math.max(1, rect.width);
    return Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (n === 0) return;
    const current = activeIndex ?? (selectedIndex >= 0 ? selectedIndex : n - 1);
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, number> = { ArrowLeft: current - step, ArrowRight: current + step, Home: 0, End: n - 1 };
    if (e.key in moves) {
      e.preventDefault();
      setActiveIndex(Math.min(n - 1, Math.max(0, moves[e.key]!)));
    } else if ((e.key === "Enter" || e.key === " ") && activeIndex !== null) {
      e.preventDefault();
      onSelect(points[activeIndex]!.id);
    } else if (e.key === "Escape") {
      setActiveIndex(null);
    }
  };

  const active = activeIndex !== null ? points[activeIndex] : undefined;
  const activeX = activeIndex !== null ? x(activeIndex) : 0;
  // 提示框始终贴在指针另一侧，避免遮住当前数据点
  const isTooltipOnLeft = activeX > width / 2;

  const title = mode === "context" ? t.chart.titleContext : t.chart.titleOutput;

  return (
    <section aria-labelledby="growth-title" className="rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-6">
      <SectionTitle
        icon={TrendingUp}
        aside={
          <Segmented
            label={t.chart.metric}
            value={mode}
            onChange={setMode}
            options={[
              { value: "context", label: t.chart.modeContext },
              { value: "output", label: t.chart.modeOutput },
            ]}
          />
        }
      >
        <span id="growth-title">{title}</span>
      </SectionTitle>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-fg-2">
        {mode === "context" ? (
          <span>{t.chart.subtitleContext(f.compact(contextLimit))}</span>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-fg-2" aria-hidden />
              {t.chart.output}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-fg-3" aria-hidden />
              {t.chart.reasoning}
            </span>
          </>
        )}
        <span className="ml-auto hidden sm:inline">{t.chart.clickHint}</span>
      </div>

      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label={t.chart.groupLabel(title)}
        onKeyDown={onKeyDown}
        onBlur={() => setActiveIndex(null)}
        className="relative mt-3 rounded-md"
        style={{ height: HEIGHT }}
      >
        {width > 0 && n > 0 && (
          <svg width={width} height={HEIGHT} className="block select-none" aria-hidden>
            {/* 横向网格与刻度 */}
            {[0, 0.5, 1].map((fraction) => (
              <g key={fraction}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(fraction * yMax)}
                  y2={y(fraction * yMax)}
                  className="stroke-line"
                  strokeDasharray={fraction === 0 ? undefined : "2 4"}
                />
                <text x={PAD.left - 8} y={y(fraction * yMax)} dy="0.32em" textAnchor="end" className="fill-fg-2 text-caption tabular-nums">
                  {f.compact(fraction * yMax)}
                </text>
              </g>
            ))}

            {/* 轮次分界 */}
            {turnStarts.map((start, k) => {
              const tx = x(start.index);
              const nextX = turnStarts[k + 1] ? x(turnStarts[k + 1]!.index) : width - PAD.right;
              const isLabelFit = nextX - tx > 48;
              return (
                <g key={start.turn}>
                  <line x1={tx} x2={tx} y1={PAD.top - 8} y2={PAD.top + plotH} className="stroke-line" strokeDasharray="2 3" />
                  {isLabelFit && (
                    <text x={tx + 4} y={PAD.top - 12} className="fill-fg-2 text-caption">
                      {t.chart.turn(start.turn)}
                    </text>
                  )}
                  {isLabelFit && (
                    <text x={tx} y={HEIGHT - 6} textAnchor={k === 0 ? "start" : "middle"} className="fill-fg-2 text-caption tabular-nums">
                      {f.clock(start.at)}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={width - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-fg-2 text-caption tabular-nums">
              {f.clock(points[n - 1]!.createdAt)}
            </text>

            {mode === "context" ? (
              <>
                <path d={areaPath} className="fill-accent/10" />
                <path d={linePath} fill="none" strokeWidth={1.5} strokeLinejoin="round" className="stroke-accent" />
              </>
            ) : (
              points.map((p, i) => {
                const output = p.tokens?.output ?? 0;
                const reasoning = p.tokens?.reasoning ?? 0;
                const isActive = i === activeIndex || i === selectedIndex;
                return (
                  <g key={p.id}>
                    <rect x={x(i) - barWidth / 2} width={barWidth} y={y(output)} height={y(0) - y(output)} className={isActive ? "fill-accent" : "fill-fg-2"} />
                    <rect
                      x={x(i) - barWidth / 2}
                      width={barWidth}
                      y={y(output + reasoning)}
                      height={y(output) - y(output + reasoning)}
                      className={isActive ? "fill-accent/60" : "fill-fg-3"}
                    />
                  </g>
                );
              })
            )}

            {selectedIndex >= 0 && (
              <circle cx={x(selectedIndex)} cy={y(values[selectedIndex]!)} r={4} strokeWidth={2} className="fill-accent stroke-surface" />
            )}

            {activeIndex !== null && (
              <g>
                <line x1={activeX} x2={activeX} y1={PAD.top} y2={PAD.top + plotH} className="stroke-fg-3" />
                <circle cx={activeX} cy={y(values[activeIndex]!)} r={4} strokeWidth={2} className="fill-surface stroke-accent" />
              </g>
            )}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={plotW}
              height={plotH}
              fill="transparent"
              className="cursor-crosshair"
              onPointerMove={(e) => setActiveIndex(indexFromPointer(e))}
              onPointerLeave={() => setActiveIndex(null)}
              onClick={(e) => onSelect(points[indexFromPointer(e)]!.id)}
            />
          </svg>
        )}

        {active && (
          <div
            role="status"
            className={cx(
              "pointer-events-none absolute top-4 z-10 w-56 rounded-md border border-line bg-surface p-3 shadow-md",
              isTooltipOnLeft && "-translate-x-full",
            )}
            style={{ left: isTooltipOnLeft ? activeX - 12 : activeX + 12 }}
          >
            <div className="flex items-center justify-between text-caption text-fg-2">
              <span>{t.chart.turn(active.turn)}</span>
              <span className="tabular-nums">{f.clockSeconds(active.createdAt)}</span>
            </div>
            <p className="mt-1 truncate font-mono text-caption text-fg-2">{active.id}</p>
            <dl className="mt-2 space-y-1 text-caption">
              <TooltipRow label={t.chart.context} value={f.int(active.contextTotal ?? 0)} />
              <TooltipRow label={t.chart.delta} value={f.signed(active.contextDelta ?? 0)} />
              <TooltipRow label={t.chart.outputReasoning} value={`${f.int(active.tokens?.output ?? 0)} / ${f.int(active.tokens?.reasoning ?? 0)}`} />
              {active.tools.length > 0 && (
                <TooltipRow label={t.chart.tools} value={active.tools.map((tool) => t.tools[tool]).join(t.listSeparator)} />
              )}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-2">{label}</dt>
      <dd className="truncate font-medium tabular-nums text-fg">{value}</dd>
    </div>
  );
}
