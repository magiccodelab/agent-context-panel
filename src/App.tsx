import { useEffect, useMemo, useState } from "react";
import { ContextPanel } from "./components/ContextPanel";
import { ConversationPane } from "./components/ConversationPane";
import { cx } from "./components/ui";
import { messages, session as baseSession, stats, turns } from "./data/mock";

type Theme = "dark" | "light";
const DESKTOP_QUERY = "(min-width: 1024px)";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [isPanelOpen, setIsPanelOpen] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  const [isRunning, setIsRunning] = useState(baseSession.isRunning);
  const session = useMemo(() => ({ ...baseSession, isRunning }), [isRunning]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      console.warn("主题偏好无法保存", error);
    }
  }, [theme]);

  // 窄屏下面板为浮层，Esc 关闭
  useEffect(() => {
    if (!isPanelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !window.matchMedia(DESKTOP_QUERY).matches) setIsPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPanelOpen]);

  return (
    <div className="flex h-full min-h-0 bg-bg text-fg">
      <main
        className={cx(
          "flex min-w-0 flex-1 flex-col",
          isPanelOpen && "lg:w-[clamp(400px,38%,560px)] lg:flex-none lg:border-r lg:border-line",
        )}
      >
        <ConversationPane
          session={session}
          stats={stats}
          isRunning={isRunning}
          onRunningChange={setIsRunning}
          isPanelOpen={isPanelOpen}
          onTogglePanel={() => setIsPanelOpen((v) => !v)}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        />
      </main>

      {isPanelOpen && (
        <>
          <button
            type="button"
            aria-label="关闭上下文面板"
            className="fixed inset-0 z-30 cursor-default bg-bg/60 lg:hidden"
            onClick={() => setIsPanelOpen(false)}
          />
          <aside
            aria-label="上下文"
            className="fixed inset-y-0 right-0 z-40 w-full border-l border-line shadow-md sm:w-[min(640px,92vw)] lg:static lg:z-auto lg:w-auto lg:min-w-0 lg:flex-1 lg:border-l-0 lg:shadow-none"
          >
            <ContextPanel session={session} messages={messages} turns={turns} stats={stats} onClose={() => setIsPanelOpen(false)} />
          </aside>
        </>
      )}
    </div>
  );
}
