import { Boxes, CalendarClock, Cpu, LoaderCircle, PanelRightClose, Server, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { Message, Session, SessionStats, Turn } from "../data/mock";
import { useI18n } from "../i18n/I18nProvider";
import { ContextUsageCard } from "./ContextUsageCard";
import { GrowthChart } from "./GrowthChart";
import { MessageList } from "./MessageList";
import { StatTiles } from "./StatTiles";
import { IconButton } from "./ui";

interface ContextPanelProps {
  session: Session;
  messages: Message[];
  turns: Turn[];
  stats: SessionStats;
  onClose: () => void;
}

export function ContextPanel({ session, messages, turns, stats, onClose }: ContextPanelProps) {
  const { t, f, pick } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const assistantMessages = useMemo(() => messages.filter((m) => m.role === "assistant"), [messages]);
  const title = pick(session.title);

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <div role="tablist" aria-label={t.panel.tablist} className="flex items-center gap-1">
          <button
            type="button"
            role="tab"
            aria-selected="true"
            className="inline-flex h-8 items-center gap-2 rounded-md bg-surface-2 px-3 text-body-sm font-medium text-fg"
          >
            {session.isRunning ? (
              <LoaderCircle className="size-4 animate-spin text-fg-3" strokeWidth={1.75} aria-label={t.panel.sessionRunning} />
            ) : (
              <Boxes className="size-4 text-fg-3" strokeWidth={1.75} aria-hidden />
            )}
            {t.panel.tab}
          </button>
        </div>
        <IconButton icon={PanelRightClose} label={t.panel.collapse} onClick={onClose} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-h3 font-semibold text-fg" title={title}>
                {title}
              </h1>
              <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-fg-2">
                <MetaItem icon={Server} label={t.panel.provider}>
                  {session.provider}
                </MetaItem>
                <MetaItem icon={Cpu} label={t.panel.model}>
                  {session.model}
                </MetaItem>
                <MetaItem icon={CalendarClock} label={t.panel.createdAt}>
                  {f.dateTime(stats.createdAt)}
                </MetaItem>
              </ul>
            </div>
            <span
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1 text-caption text-fg-2"
              aria-live="polite"
            >
              <span className={session.isRunning ? "size-2 animate-pulse-dot rounded-full bg-success" : "size-2 rounded-full bg-fg-3"} aria-hidden />
              {session.isRunning ? t.panel.running : t.panel.lastActive(f.dateTime(stats.lastActiveAt))}
            </span>
          </header>

          <ContextUsageCard session={session} stats={stats} />
          <StatTiles stats={stats} turnCount={turns.length} />
          <GrowthChart points={assistantMessages} turns={turns} contextLimit={session.contextLimit} selectedId={selectedId} onSelect={setSelectedId} />
          <MessageList session={session} turns={turns} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1" title={label}>
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{label}: </span>
      {children}
    </li>
  );
}
