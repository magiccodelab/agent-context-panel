import { CircleDollarSign, Clock3, DatabaseZap, MessagesSquare, type LucideIcon } from "lucide-react";
import type { SessionStats } from "../data/mock";
import { useI18n } from "../i18n/I18nProvider";

interface Tile {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}

export function StatTiles({ stats, turnCount }: { stats: SessionStats; turnCount: number }) {
  const { t, f } = useI18n();
  const tiles: Tile[] = [
    {
      icon: MessagesSquare,
      label: t.stats.messages,
      value: f.int(stats.messageCount),
      detail: t.stats.messagesDetail(f.int(stats.userCount), f.int(stats.assistantCount)),
    },
    {
      icon: DatabaseZap,
      label: t.stats.cacheHit,
      value: f.percent(stats.cacheHitRate, 1),
      detail: t.stats.cacheDetail(f.int(stats.lastUsage.cacheRead), f.int(stats.lastUsage.cacheWrite)),
    },
    {
      icon: Clock3,
      label: t.stats.duration,
      value: f.duration(stats.lastActiveAt - stats.createdAt),
      detail: t.stats.durationDetail(f.clock(stats.createdAt), f.clock(stats.lastActiveAt)),
    },
    {
      icon: CircleDollarSign,
      label: t.stats.cost,
      value: f.usd(stats.totalCost),
      detail: t.stats.costDetail(turnCount, f.usd(turnCount > 0 ? stats.totalCost / turnCount : 0)),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-sm xl:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value, detail }) => (
        <div key={label} className="min-w-0 bg-surface p-4">
          <dt className="flex items-center gap-2 text-caption text-fg-2">
            <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{label}</span>
          </dt>
          <dd className="mt-2 truncate text-h3 font-semibold tabular-nums text-fg">{value}</dd>
          <dd className="mt-1 truncate text-caption tabular-nums text-fg-2" title={detail}>
            {detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
