import {
  Bot,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  FileJson,
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
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toRawMessage, sessionExportPayload, downloadText, type ExportFormat } from "../data/export";
import type { Message, Session, ToolKind, Turn } from "../data/mock";
import { useI18n } from "../i18n/I18nProvider";
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

interface MessageListProps {
  session: Session;
  turns: Turn[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MessageList({ session, turns, selectedId, onSelect }: MessageListProps) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(() => new Set(turns.slice(-1).map((turn) => turn.index)));
  const [openId, setOpenId] = useState<string | null>(null);

  const allMessages = useMemo(() => turns.flatMap((turn) => [turn.user, ...turn.replies]), [turns]);
  const userCount = turns.length;
  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0 || role !== "all";

  const groups = useMemo(() => {
    // 只匹配当前语言下可见的提问文案，与用户看到的内容保持一致
    const matches = (m: Message) =>
      (role === "all" || m.role === role) &&
      (!normalizedQuery || m.id.toLowerCase().includes(normalizedQuery) || (m.text?.[locale] ?? "").toLowerCase().includes(normalizedQuery));
    return turns.map((turn) => ({ turn, rows: [turn.user, ...turn.replies].filter(matches) })).filter((g) => !isFiltering || g.rows.length > 0);
  }, [turns, role, normalizedQuery, isFiltering, locale]);

  const matchCount = groups.reduce((n, g) => n + g.rows.length, 0);
  const isAllExpanded = expandedTurns.size === turns.length;

  // 图表点选后：先展开所在轮次，等该行提交到 DOM 后再滚动到它
  const pendingScrollId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const target = allMessages.find((m) => m.id === selectedId);
    if (!target) return;
    pendingScrollId.current = selectedId;
    setExpandedTurns((prev) => (prev.has(target.turn) ? prev : new Set(prev).add(target.turn)));
  }, [selectedId, allMessages]);

  useEffect(() => {
    const id = pendingScrollId.current;
    if (!id) return;
    const row = document.getElementById(`row-${id}`);
    if (!row) return;
    pendingScrollId.current = null;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  const toggleTurn = (index: number) =>
    setExpandedTurns((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const exportSession = (format: ExportFormat) => {
    const payload = sessionExportPayload(session, allMessages, locale, format);
    downloadText(payload.filename, payload.content, payload.mime);
  };

  return (
    <section aria-labelledby="raw-title" className="space-y-3">
      <SectionTitle
        icon={ListTree}
        aside={
          <ExportMenu onExport={exportSession} />
        }
      >
        <span id="raw-title">{t.messages.title}</span>
      </SectionTitle>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">{t.messages.search}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={t.messages.searchPlaceholder}
            className="h-8 w-full rounded-sm border border-line bg-surface pr-8 pl-8 text-body-sm text-fg placeholder:text-fg-3 focus-visible:outline-offset-0 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <IconButton icon={X} label={t.messages.clearSearch} size="sm" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => setQuery("")} />
          )}
        </label>
        <Segmented
          label={t.messages.roleFilter}
          value={role}
          onChange={setRole}
          options={[
            { value: "all", label: t.messages.all, count: allMessages.length },
            { value: "user", label: t.messages.user, count: userCount },
            { value: "assistant", label: t.messages.assistant, count: allMessages.length - userCount },
          ]}
        />
        <IconButton
          icon={isAllExpanded ? ChevronsDownUp : ChevronsUpDown}
          label={isAllExpanded ? t.messages.collapseAll : t.messages.expandAll}
          disabled={isFiltering}
          onClick={() => setExpandedTurns(isAllExpanded ? new Set() : new Set(turns.map((turn) => turn.index)))}
        />
      </div>

      {isFiltering && (
        <p className="text-caption tabular-nums text-fg-2" aria-live="polite">
          {t.messages.found(matchCount)}
        </p>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-4 py-12 text-center">
          <Search className="size-6 text-fg-3" strokeWidth={1.5} aria-hidden />
          <p className="text-body-sm text-fg-2">{t.messages.empty}</p>
          <button
            type="button"
            className="text-caption text-accent hover:text-accent-hover hover:underline"
            onClick={() => {
              setQuery("");
              setRole("all");
            }}
          >
            {t.messages.clearFilters}
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

function ExportMenu({ onExport }: { onExport: (format: ExportFormat) => void }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuID = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const pick = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuID : undefined}
        onClick={() => setIsOpen((v) => !v)}
        className={cx(
          "inline-flex h-8 items-center gap-2 rounded-sm px-2 text-caption text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg active:scale-[0.98]",
          isOpen && "bg-surface-2 text-fg",
        )}
      >
        <Download className="size-4" strokeWidth={1.75} aria-hidden />
        {t.messages.export}
        <ChevronDown className={cx("size-3.5 shrink-0 text-fg-3 transition-transform", isOpen && "rotate-180")} strokeWidth={1.75} aria-hidden />
      </button>
      {isOpen && (
        <div
          id={menuID}
          role="menu"
          aria-label={t.messages.exportFormat}
          className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-line bg-surface p-1 shadow-md"
        >
          <div className="px-2 py-1 text-caption text-fg-2">{t.messages.exportFormat}</div>
          {(
            [
              { format: "json" as const, label: t.messages.exportJson, hint: t.messages.exportJsonHint, icon: FileJson },
              { format: "markdown" as const, label: t.messages.exportMarkdown, hint: t.messages.exportMarkdownHint, icon: FileText },
            ] satisfies { format: ExportFormat; label: string; hint: string; icon: LucideIcon }[]
          ).map(({ format, label, hint, icon: Icon }) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              onClick={() => pick(format)}
              className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm text-fg">{label}</span>
                <span className="block text-caption text-fg-2">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TurnHeader({ turn, isExpanded, isToggleEnabled, onToggle }: { turn: Turn; isExpanded: boolean; isToggleEnabled: boolean; onToggle: () => void }) {
  const { t, f, pick } = useI18n();
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
          {t.messages.turn(turn.index)} ·{" "}
          <span className="tabular-nums">
            {f.clock(turn.startedAt)}–{f.clock(turn.endedAt)}
          </span>
        </span>
        <span className="block truncate text-body-sm font-medium text-fg">{turn.user.text ? pick(turn.user.text) : ""}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-4 text-caption text-fg-2 sm:flex">
        <span className="flex items-center gap-1 tabular-nums" title={t.messages.replies(turn.replies.length)}>
          <Bot className="size-4" strokeWidth={1.75} aria-hidden />
          {turn.replies.length}
        </span>
        <span className="w-16 text-right tabular-nums" title={t.messages.turnGrowth(f.int(turn.tokenDelta))}>
          +{f.compact(turn.tokenDelta)}
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
  const { t, f } = useI18n();
  const isUser = m.role === "user";
  const isLargeDelta = (m.contextDelta ?? 0) >= LARGE_DELTA;
  const RoleIcon = isUser ? User : Bot;
  const icons: { key: string; icon: LucideIcon; label: string }[] =
    m.tools.length > 0
      ? m.tools.map((tool) => ({ key: tool, icon: TOOL_ICON[tool], label: t.tools[tool] }))
      : isUser
        ? []
        : [{ key: "text", icon: MessageSquareText, label: t.messages.textReply }];

  return (
    <li id={`row-${m.id}`} className={cx("scroll-mt-12 transition-colors", isSelected ? "bg-accent/10" : isOpen && "bg-surface-2/40")}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-2 pr-3 pl-12 text-left transition-colors hover:bg-surface-2/50"
      >
        <RoleIcon className={cx("size-4 shrink-0", isUser ? "text-fg" : "text-fg-3")} strokeWidth={1.75} aria-hidden />
        {/* 角色字段保持原始值，与 JSON 中的 role 一致 */}
        <span className={cx("w-16 shrink-0 text-body-sm", isUser ? "font-medium text-fg" : "text-fg-2")} lang="en">
          {m.role}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-caption text-fg-2">{m.id}</span>
        <span className="hidden w-12 shrink-0 items-center justify-end gap-1 text-fg-3 md:flex">
          {icons.map(({ key, icon: Icon, label }) => (
            <span key={key} role="img" aria-label={label} title={label}>
              <Icon className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
          ))}
        </span>
        <span
          className={cx("hidden w-16 shrink-0 text-right text-caption tabular-nums sm:block", isLargeDelta ? "font-medium text-fg" : "text-fg-2")}
          title={isLargeDelta ? t.messages.largeDelta : t.messages.delta}
        >
          {m.contextDelta !== undefined ? f.signed(m.contextDelta) : ""}
        </span>
        <time className="shrink-0 text-caption tabular-nums text-fg-2" dateTime={new Date(m.createdAt).toISOString()}>
          {f.clockSeconds(m.createdAt)}
        </time>
        <ChevronDown className={cx("size-4 shrink-0 text-fg-3 transition-transform", isOpen && "rotate-180")} strokeWidth={1.75} aria-hidden />
      </button>
      {isOpen && <RawMessagePanel session={session} message={m} />}
    </li>
  );
}

function RawMessagePanel({ session, message: m }: { session: Session; message: Message }) {
  const { t, f, locale } = useI18n();
  const json = useMemo(() => JSON.stringify(toRawMessage(session, m, locale), null, 2), [session, m, locale]);
  const { copiedKey, copy } = useClipboard();
  const tokens = m.tokens;
  const copyActions = [
    { kind: "id", label: t.messages.copyId, text: m.id },
    { kind: "json", label: t.messages.copyJson, text: json },
  ];

  return (
    <div className="mr-3 mb-3 ml-12 overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="text-caption tabular-nums text-fg-2">
          {tokens
            ? t.messages.tokenBreakdown(f.int(tokens.input), f.int(tokens.output), f.int(tokens.reasoning), f.int(tokens.cacheRead), f.int(tokens.cacheWrite))
            : t.messages.userPrompt}
        </p>
        <div className="flex items-center gap-1">
          {copyActions.map(({ kind, label, text }) => {
            const key = `${m.id}:${kind}`;
            const isCopied = copiedKey === key;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => void copy(text, key)}
                className={cx(
                  "h-6 rounded-sm px-2 text-caption transition-colors hover:bg-surface-2 active:scale-[0.98]",
                  isCopied ? "text-success" : "text-fg-2 hover:text-fg",
                )}
              >
                {isCopied ? t.messages.copied : label}
              </button>
            );
          })}
        </div>
      </div>
      {/* 内容可能超出高度而滚动，需可聚焦以便键盘用户滚动查看 */}
      <pre tabIndex={0} aria-label={t.messages.rawJson} className="max-h-64 overflow-auto p-3 font-mono text-caption text-fg-2 focus-visible:outline-offset-[-2px]">
        {json}
      </pre>
    </div>
  );
}
