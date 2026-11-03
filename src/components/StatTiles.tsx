import { CircleDollarSign, Clock3, DatabaseZap, MessagesSquare, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionStats } from "../data/mock";
import { formatClock, formatDuration, formatInt, formatPercent, formatUsd } from "../lib/format";

interface Tile {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  detail: ReactNode;
}

export function StatTiles({ stats, turnCount }: { stats: SessionStats; turnCount: number }) {
  const tiles: Tile[] = [
    {
      icon: MessagesSquare,
      label: "消息",
      value: formatInt(stats.messageCount),
      detail: `用户 ${formatInt(stats.userCount)} · 助手 ${formatInt(stats.assistantCount)}`,
    },
    {
      icon: DatabaseZap,
      label: "缓存命中",
      value: formatPercent(stats.cacheHitRate, 1),
      detail: `读 ${formatInt(stats.lastUsage.cacheRead)} / 写 ${formatInt(stats.lastUsage.cacheWrite)}`,
    },
    {
      icon: Clock3,
      label: "会话时长",
      value: formatDuration(stats.lastActiveAt - stats.createdAt),
      detail: `${formatClock(stats.createdAt)} 创建 · ${formatClock(stats.lastActiveAt)} 活动`,
    },
    {
      icon: CircleDollarSign,
      label: "总成本",
      value: formatUsd(stats.totalCost),
      detail: `${turnCount} 轮 · 均 ${formatUsd(turnCount > 0 ? stats.totalCost / turnCount : 0)}/轮`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-sm xl:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value, detail }) => (
        <div key={label} className="min-w-0 bg-surface p-4">
          <dt className="flex items-center gap-2 text-caption text-fg-2">
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
            {label}
          </dt>
          <dd className="mt-2 truncate text-h3 font-semibold tabular-nums text-fg">{value}</dd>
          <dd className="mt-1 truncate text-caption tabular-nums text-fg-2">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
