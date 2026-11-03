import type { Locale } from "../lib/format";
import type { Message, Session } from "./mock";

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
