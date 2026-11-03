import {
  ArrowUp,
  Brain,
  ChevronDown,
  FilePen,
  FilePlus2,
  LoaderCircle,
  Moon,
  Square,
  SquareTerminal,
  Sun,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AGENT_OPTIONS, conversation, EFFORT_OPTIONS, MODEL_OPTIONS, type Step } from "../data/conversation";
import type { Session, SessionStats } from "../data/mock";
import { formatCompact, formatInt, formatPercent } from "../lib/format";
import { SelectMenu } from "./SelectMenu";
import { cx, IconButton } from "./ui";
import { UsageRing } from "./UsageRing";

interface ConversationPaneProps {
  session: Session;
  stats: SessionStats;
  isRunning: boolean;
  onRunningChange: (isRunning: boolean) => void;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function ConversationPane({ session, stats, isRunning, onRunningChange, isPanelOpen, onTogglePanel, theme, onToggleTheme }: ConversationPaneProps) {
  const [isStepsOpen, setIsStepsOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [followUps, setFollowUps] = useState<{ id: number; text: string; isQueued: boolean }[]>([]);
  const [agent, setAgent] = useState<string>("build");
  const [model, setModel] = useState<string>("model-x-flash");
  const [effort, setEffort] = useState<string>("high");

  const canSubmit = draft.trim().length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新消息加入后滚动到底部，让刚发送的内容保持可见
  useEffect(() => {
    if (followUps.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [followUps.length]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setFollowUps((list) => [...list, { id: Date.now(), text, isQueued: isRunning }]);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
        <nav aria-label="位置" className="flex min-w-0 flex-1 items-center gap-2 text-body-sm">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-caption font-semibold text-fg-2" aria-hidden>
            W
          </span>
          <span className="hidden shrink-0 text-fg-2 sm:inline">{session.workspace}</span>
          <span className="hidden text-fg-2 sm:inline" aria-hidden>
            /
          </span>
          <span className="truncate font-medium text-fg" aria-current="page">
            {session.title}
          </span>
        </nav>
        <IconButton icon={theme === "dark" ? Sun : Moon} label={theme === "dark" ? "切换到浅色" : "切换到深色"} onClick={onToggleTheme} />
        <button
          type="button"
          aria-pressed={isPanelOpen}
          onClick={onTogglePanel}
          title={`上下文 ${formatPercent(stats.usage)} · ${formatInt(stats.contextTotal)} / ${formatInt(session.contextLimit)}`}
          className={cx(
            "inline-flex h-8 items-center gap-2 rounded-sm px-2 text-caption tabular-nums transition-colors hover:bg-surface-2 hover:text-fg active:scale-[0.98]",
            isPanelOpen ? "bg-surface-2 text-fg" : "text-fg-2",
          )}
        >
          <UsageRing ratio={stats.usage} />
          {formatCompact(stats.contextTotal)}
          <span className="sr-only">，{isPanelOpen ? "收起" : "打开"}上下文面板</span>
        </button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-lg bg-surface-2 px-4 py-3 text-body-sm text-fg">{conversation.prompt}</p>
          </div>

          <div>
            <button
              type="button"
              aria-expanded={isStepsOpen}
              onClick={() => setIsStepsOpen((v) => !v)}
              className="flex w-full items-center gap-2 rounded-sm py-1 text-left text-body-sm text-fg-2 transition-colors hover:text-fg"
            >
              <Wrench className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
              <span className="truncate">
                使用了 <span className="font-medium text-fg tabular-nums">{conversation.toolSummary.count}</span> 个工具
                <span className="text-fg-2"> · {conversation.toolSummary.kinds.join("、")}</span>
              </span>
              <ChevronDown className={cx("size-4 shrink-0 text-fg-3 transition-transform", isStepsOpen && "rotate-180")} strokeWidth={1.75} aria-hidden />
            </button>

            {isStepsOpen && (
              <ol className="mt-2 ml-2 space-y-1 border-l border-line pl-4">
                {conversation.steps.map((step, i) => (
                  <li key={i}>
                    <StepRow step={step} />
                  </li>
                ))}
              </ol>
            )}
          </div>

          {isRunning && (
            <p className="flex items-center gap-2 text-body-sm text-fg-2" role="status">
              <LoaderCircle className="size-4 animate-spin" strokeWidth={1.75} aria-hidden />
              工作中
            </p>
          )}

          {followUps.map((f) => (
            <div key={f.id} className="flex flex-col items-end gap-1">
              <p className="max-w-[85%] rounded-lg bg-surface-2 px-4 py-3 text-body-sm whitespace-pre-wrap text-fg">{f.text}</p>
              {f.isQueued && isRunning && <span className="text-caption text-fg-2">排队中，当前任务完成后发送</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4">
        <form
          className="mx-auto max-w-3xl rounded-lg border border-line bg-surface p-3 shadow-sm transition-colors focus-within:border-fg-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="composer" className="sr-only">
            消息
          </label>
          <textarea
            id="composer"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="添加后续消息，输入 / 使用命令，输入 @ 添加上下文…"
            className="block w-full resize-none bg-transparent px-1 text-body-sm text-fg placeholder:text-fg-3 focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-1">
            <div className="shrink-0">
              <SelectMenu label="代理" value={agent} onChange={setAgent} options={[...AGENT_OPTIONS]} />
            </div>
            <div className="min-w-0">
              <SelectMenu label="模型" value={model} onChange={setModel} options={[...MODEL_OPTIONS]} />
            </div>
            <div className="shrink-0">
              <SelectMenu label="推理强度" value={effort} onChange={setEffort} options={[...EFFORT_OPTIONS]} />
            </div>
            <div className="flex-1" />
            {isRunning && !canSubmit ? (
              <button
                type="button"
                aria-label="停止生成"
                title="停止生成"
                onClick={() => onRunningChange(false)}
                className="inline-flex size-8 items-center justify-center rounded-md bg-fg text-bg transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                <Square className="size-4" fill="currentColor" strokeWidth={0} aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                aria-label={isRunning ? "加入队列" : "发送"}
                title={isRunning ? "加入队列" : "发送"}
                disabled={!canSubmit}
                className="inline-flex size-8 items-center justify-center rounded-md bg-accent text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:hover:bg-accent"
              >
                <ArrowUp className="size-4" strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function StepRow({ step }: { step: Step }) {
  if (step.kind === "thinking") {
    return (
      <p className="flex items-center gap-2 py-1 text-caption text-fg-2">
        <Brain className="size-4" strokeWidth={1.75} aria-hidden />
        思考 {step.seconds} 秒
      </p>
    );
  }

  if (step.kind === "shell") {
    return (
      <div className="flex min-w-0 items-center gap-2 py-1 text-body-sm">
        <SquareTerminal className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
        <span className="shrink-0 font-medium text-fg">Shell</span>
        <code className="min-w-0 truncate font-mono text-caption text-fg-2" title={step.command}>
          {step.command}
        </code>
      </div>
    );
  }

  const Icon = step.action === "write" ? FilePlus2 : FilePen;
  const slash = step.path.lastIndexOf("/");
  return (
    <div className="my-1 flex min-w-0 items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-body-sm">
      <Icon className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{step.action === "write" ? "写入" : "编辑"}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-caption" title={step.path}>
        <span className="text-fg-2">{step.path.slice(0, slash + 1)}</span>
        <span className="text-fg">{step.path.slice(slash + 1)}</span>
      </span>
      <span className="shrink-0 font-mono text-caption tabular-nums">
        <span className="text-success">+{step.added}</span> <span className="text-danger">-{step.removed}</span>
      </span>
    </div>
  );
}
