import {
  Bot,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  FilePen,
  FilePlus2,
  FileSearch,
  FileText,
  Globe,
  ListTree,
  MessageSquareText,
  Search,
  SquareTerminal,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TOOL_LABEL, type Message, type Session, type ToolKind, type Turn } from "../data/mock";
import { formatClock, formatClockSeconds, formatCompact, formatInt, formatSigned } from "../lib/format";
import { cx, IconButton, Segmented, SectionTitle, useClipboard } from "./ui";

type RoleFilter = "all" | "user" | "assistant";

/** 单条消息上下文增长超过该值时加重显示，便于找出读取大文件、长输出等高消耗步骤 */
const LARGE_DELTA = 3000;

const TOOL_ICON: Record<ToolKind, LucideIcon> = {
  shell: SquareTerminal,
  read: FileText,
  edit: FilePen,
  write: FilePlus2,
  search: Globe,
  grep: FileSearch,
};

export function toRawMessage(session: Session, m: Message) {
  if (m.role === "user") {
    return { id: m.id, sessionID: session.id, role: m.role, time: { created: m.createdAt }, parts: [{ type: "text", text: m.text }] };
  }
  return {
    id: m.id,
    sessionID: session.id,
    role: m.role,
    time: { created: m.createdAt },
    providerID: session.provider,
    modelID: session.model,
    tokens: {
      input: m.tokens?.input,
      output: m.tokens?.output,
      reasoning: m.tokens?.reasoning,
      cache: { read: m.tokens?.cacheRead, write: m.tokens?.cacheWrite },
    },
    cost: m.cost,
    finish: m.finish,
    parts: m.tools.length > 0 ? m.tools.map((tool) => ({ type: "tool", tool })) : [{ type: "text" }],
  };
}

interface MessageListProps {
  session: Session;
  turns: Turn[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MessageList({ session, turns, selectedId, onSelect }: MessageListProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(() => new Set(turns.slice(-1).map((t) => t.index)));
  const [openId, setOpenId] = useState<string | null>(null);

  const allMessages = useMemo(() => turns.flatMap((t) => [t.user, ...t.replies]), [turns]);
  const userCount = turns.length;
  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0 || role !== "all";

  const groups = useMemo(() => {
    const matches = (m: Message) =>
      (role === "all" || m.role === role) &&
      (!normalizedQuery || m.id.toLowerCase().includes(normalizedQuery) || (m.text ?? "").toLowerCase().includes(normalizedQuery));
    return turns.map((turn) => ({ turn, rows: [turn.user, ...turn.replies].filter(matches) })).filter((g) => !isFiltering || g.rows.length > 0);
  }, [turns, role, normalizedQuery, isFiltering]);

  const matchCount = groups.reduce((n, g) => n + g.rows.length, 0);
  const isAllExpanded = expandedTurns.size === turns.length;

  // 图表点选后：展开所在轮次并滚动到对应行
  useEffect(() => {
    if (!selectedId) return;
    const target = allMessages.find((m) => m.id === selectedId);
    if (!target) return;
    setExpandedTurns((prev) => (prev.has(target.turn) ? prev : new Set(prev).add(target.turn)));
    const frame = requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(`row-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedId, allMessages]);

  const toggleTurn = (index: number) =>
    setExpandedTurns((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const exportSession = () => {
    const payload = { session, messages: allMessages.map((m) => toRawMessage(session, m)) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${session.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="raw-title" className="space-y-3">
      <SectionTitle
        icon={ListTree}
        aside={
          <button
            type="button"
            onClick={exportSession}
            className="inline-flex h-8 items-center gap-2 rounded-sm px-2 text-caption text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg active:scale-[0.98]"
          >
            <Download className="size-4" strokeWidth={1.75} aria-hidden />
            导出会话
          </button>
        }
      >
        <span id="raw-title">原始消息</span>
      </SectionTitle>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">搜索消息</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="搜索消息 ID 或提问内容"
            className="h-8 w-full rounded-sm border border-line bg-surface pr-8 pl-8 text-body-sm text-fg placeholder:text-fg-3 focus-visible:outline-offset-0 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <IconButton icon={X} label="清空搜索" size="sm" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setQuery("")} />
          )}
        </label>
        <Segmented
          label="按角色筛选"
          value={role}
          onChange={setRole}
          options={[
            { value: "all", label: "全部", count: allMessages.length },
            { value: "user", label: "用户", count: userCount },
            { value: "assistant", label: "助手", count: allMessages.length - userCount },
          ]}
        />
        <IconButton
          icon={isAllExpanded ? ChevronsDownUp : ChevronsUpDown}
          label={isAllExpanded ? "全部收起" : "全部展开"}
          disabled={isFiltering}
          onClick={() => setExpandedTurns(isAllExpanded ? new Set() : new Set(turns.map((t) => t.index)))}
        />
      </div>

      {isFiltering && (
        <p className="text-caption text-fg-2" aria-live="polite">
          找到 <span className="tabular-nums text-fg">{matchCount}</span> 条消息
        </p>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-4 py-12 text-center">
          <Search className="size-6 text-fg-3" strokeWidth={1.5} aria-hidden />
          <p className="text-body-sm text-fg-2">没有匹配的消息</p>
          <button
            type="button"
            className="text-caption text-accent hover:text-accent-hover hover:underline"
            onClick={() => {
              setQuery("");
              setRole("all");
            }}
          >
            清除筛选
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
          {groups.map(({ turn, rows }) => {
            const isExpanded = isFiltering || expandedTurns.has(turn.index);
            return (
              <li key={turn.index}>
                <TurnHeader turn={turn} isExpanded={isExpanded} isToggleEnabled={!isFiltering} onToggle={() => toggleTurn(turn.index)} />
                {isExpanded && (
                  <ul className="border-t border-line">
                    {rows.map((m) => (
                      <MessageRow
                        key={m.id}
                        session={session}
                        message={m}
                        isOpen={openId === m.id}
                        isSelected={selectedId === m.id}
                        onToggle={() => {
                          setOpenId((id) => (id === m.id ? null : m.id));
                          onSelect(m.id);
                        }}
                      />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TurnHeader({ turn, isExpanded, isToggleEnabled, onToggle }: { turn: Turn; isExpanded: boolean; isToggleEnabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      disabled={!isToggleEnabled}
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2/50 disabled:cursor-default disabled:opacity-100"
    >
      <ChevronRight className={cx("size-4 shrink-0 text-fg-3 transition-transform", isExpanded && "rotate-90")} strokeWidth={1.75} aria-hidden />
      <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-fg-2">
        <User className="size-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption text-fg-2">
          第 {turn.index} 轮 · <span className="tabular-nums">{formatClock(turn.startedAt)}–{formatClock(turn.endedAt)}</span>
        </span>
        <span className="block truncate text-body-sm font-medium text-fg">{turn.user.text}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-4 text-caption text-fg-2 sm:flex">
        <span className="flex items-center gap-1 tabular-nums" title={`${turn.replies.length} 条助手回复`}>
          <Bot className="size-4" strokeWidth={1.75} aria-hidden />
          {turn.replies.length}
        </span>
        <span className="w-16 text-right tabular-nums" title={`本轮上下文增长 ${formatInt(turn.tokenDelta)} 词元`}>
          +{formatCompact(turn.tokenDelta)}
        </span>
      </span>
    </button>
  );
}

function MessageRow({
  session,
  message: m,
  isOpen,
  isSelected,
  onToggle,
}: {
  session: Session;
  message: Message;
  isOpen: boolean;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const isUser = m.role === "user";
  const isLargeDelta = (m.contextDelta ?? 0) >= LARGE_DELTA;
  const RoleIcon = isUser ? User : Bot;
  const icons: { key: string; icon: LucideIcon; label: string }[] =
    m.tools.length > 0
      ? m.tools.map((t) => ({ key: t, icon: TOOL_ICON[t], label: TOOL_LABEL[t] }))
      : isUser
        ? []
        : [{ key: "text", icon: MessageSquareText, label: "文本回复" }];

  return (
    <li id={`row-${m.id}`} className={cx("scroll-mt-12 transition-colors", isSelected ? "bg-accent/10" : isOpen && "bg-surface-2/40")}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-2 pr-3 pl-12 text-left transition-colors hover:bg-surface-2/50"
      >
        <RoleIcon className={cx("size-4 shrink-0", isUser ? "text-fg" : "text-fg-3")} strokeWidth={1.75} aria-hidden />
        <span className={cx("w-16 shrink-0 text-body-sm", isUser ? "font-medium text-fg" : "text-fg-2")}>{m.role}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-caption text-fg-2">{m.id}</span>
        <span className="hidden w-12 shrink-0 items-center justify-end gap-1 text-fg-3 md:flex">
          {icons.map(({ key, icon: Icon, label }) => (
            <span key={key} role="img" aria-label={label} title={label}>
              <Icon className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
          ))}
        </span>
        <span
          className={cx(
            "hidden w-16 shrink-0 text-right text-caption tabular-nums sm:block",
            isLargeDelta ? "font-medium text-fg" : "text-fg-2",
          )}
          title={isLargeDelta ? "上下文大幅增长" : "上下文增量"}
        >
          {m.contextDelta !== undefined ? formatSigned(m.contextDelta) : ""}
        </span>
        <time className="shrink-0 text-caption tabular-nums text-fg-2" dateTime={new Date(m.createdAt).toISOString()}>
          {formatClockSeconds(m.createdAt)}
        </time>
        <ChevronDown className={cx("size-4 shrink-0 text-fg-3 transition-transform", isOpen && "rotate-180")} strokeWidth={1.75} aria-hidden />
      </button>
      {isOpen && <RawMessagePanel session={session} message={m} />}
    </li>
  );
}

function RawMessagePanel({ session, message: m }: { session: Session; message: Message }) {
  const json = useMemo(() => JSON.stringify(toRawMessage(session, m), null, 2), [session, m]);
  const { copiedKey, copy } = useClipboard();
  const t = m.tokens;

  return (
    <div className="mr-3 mb-3 ml-12 overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="text-caption tabular-nums text-fg-2">
          {t
            ? `输入 ${formatInt(t.input)} · 输出 ${formatInt(t.output)} · 推理 ${formatInt(t.reasoning)} · 缓存 ${formatInt(t.cacheRead)} / ${formatInt(t.cacheWrite)}`
            : "用户提问"}
        </p>
        <div className="flex items-center gap-1">
          {(["ID", "JSON"] as const).map((kind) => {
            const key = `${m.id}:${kind}`;
            const isCopied = copiedKey === key;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => void copy(kind === "ID" ? m.id : json, key)}
                className={cx(
                  "h-6 rounded-sm px-2 text-caption transition-colors hover:bg-surface-2 active:scale-[0.98]",
                  isCopied ? "text-success" : "text-fg-2 hover:text-fg",
                )}
              >
                {isCopied ? "已复制" : `复制 ${kind}`}
              </button>
            );
          })}
        </div>
      </div>
      <pre className="max-h-64 overflow-auto p-3 font-mono text-caption text-fg-2">{json}</pre>
    </div>
  );
}
