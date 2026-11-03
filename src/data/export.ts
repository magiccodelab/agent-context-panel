import type { Locale } from "../lib/format";
import type { Message, Session, ToolKind } from "./mock";

/** 生成与原始消息接口结构一致的 JSON，面向用户的文案按当前语言取值 */
export function toRawMessage(session: Session, m: Message, locale: Locale) {
  if (m.role === "user") {
    return { id: m.id, sessionID: session.id, role: m.role, time: { created: m.createdAt }, parts: [{ type: "text", text: m.text?.[locale] ?? "" }] };
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

export function toSessionExport(session: Session, messages: Message[], locale: Locale) {
  return {
    session: { ...session, title: session.title[locale] },
    messages: messages.map((m) => toRawMessage(session, m, locale)),
  };
}

export type ExportFormat = "json" | "markdown";

const formatter = (locale: Locale) =>
  new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Shanghai",
  });

/**
 * 仅对话正文的 Markdown：保留用户提问与助手文本回复，去掉推理、工具调用、耗时与词元明细。
 * 目标是能直接交给另一个模型或人阅读的摘要稿，体积远小于完整转录。
 */
export function toMarkdownTranscript(session: Session, messages: Message[], locale: Locale) {
  const time = formatter(locale);
  const title = session.title[locale];
  const header = [
    `# ${title}`,
    "",
    `- Session: \`${session.id}\``,
    `- Model: ${session.provider} / ${session.model}`,
    `- Messages: ${messages.length}`,
    `- Exported: ${time.format(Date.now())}`,
    "",
    "---",
    "",
  ];

  const body: string[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      const text = message.text?.[locale]?.trim();
      if (!text) continue;
      body.push("## User", "", text, "");
      continue;
    }
    // 助手消息只取文本：工具调用、推理和耗时都属于上下文细节，交接时不需要
    const text = assistantText(message, locale);
    if (!text) continue;
    body.push("## Assistant", "", text, "");
  }

  return `${[...header, ...body].join("\n").trimEnd()}\n`;
}

/** 助手正文：优先取正文摘要，没有正文时按工具给一句可读说明 */
function assistantText(message: Message, locale: Locale) {
  const direct = message.text?.[locale]?.trim();
  if (direct) return direct;
  if (message.tools.length === 0) return "";
  const names = message.tools.map((tool) => TOOL_LABEL[tool][locale]).join(", ");
  return `_${TOOL_ONLY[locale].replace("{tools}", names)}_`;
}

const TOOL_ONLY: Record<Locale, string> = {
  en: "Tool calls only: {tools}",
  zh: "仅工具调用：{tools}",
};

const TOOL_LABEL: Record<ToolKind, Record<Locale, string>> = {
  shell: { en: "shell", zh: "shell" },
  read: { en: "read", zh: "读取" },
  edit: { en: "edit", zh: "编辑" },
  write: { en: "write", zh: "写入" },
  search: { en: "web search", zh: "联网搜索" },
  grep: { en: "code search", zh: "代码检索" },
};

export function exportFilename(session: Session, format: ExportFormat) {
  return `${session.id}.${format === "markdown" ? "md" : "json"}`;
}

/** 触发浏览器下载；filename 由调用方决定，内容已是最终字符串。 */
export function downloadText(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function sessionExportPayload(session: Session, messages: Message[], locale: Locale, format: ExportFormat) {
  return format === "markdown"
    ? { filename: exportFilename(session, format), mime: "text/markdown", content: toMarkdownTranscript(session, messages, locale) }
    : {
        filename: exportFilename(session, format),
        mime: "application/json",
        content: JSON.stringify(toSessionExport(session, messages, locale), null, 2),
      };
}
