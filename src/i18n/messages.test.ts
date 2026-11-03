import { describe, expect, test } from "bun:test";
import { toRawMessage, toSessionExport } from "../data/export";
import { generateMessages, session } from "../data/mock";
import { dictionaries, en, zh } from "./messages";

/** 递归收集字典结构：字符串记为 "string"，函数记为参数个数，便于对比两种语言是否一一对应 */
function shape(value: unknown): unknown {
  if (typeof value === "function") return `fn/${value.length}`;
  if (typeof value === "string") return "string";
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, shape((value as Record<string, unknown>)[key])]),
    );
  }
  return typeof value;
}

function collectStrings(value: unknown, sample: unknown[] = [1, "X", "Y", "Z", "W"]): string[] {
  if (typeof value === "function") return [value(...sample)];
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap((v) => collectStrings(v, sample));
  return [];
}

describe("i18n 字典", () => {
  test("中英文字典结构与函数参数个数完全一致", () => {
    expect(shape(zh)).toEqual(shape(en));
  });

  test("没有空文案", () => {
    for (const dict of Object.values(dictionaries)) {
      for (const text of collectStrings(dict)) expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test("英文字典不含中文（语言切换入口除外）", () => {
    const { language, ...rest } = en;
    const hasCjk = (s: string) => /[\u4e00-\u9fff]/.test(s);
    expect(collectStrings(rest).filter(hasCjk)).toEqual([]);
    expect(language.targetShort).toBe("中文");
  });

  test("英文复数形式", () => {
    expect(en.chat.toolsUsed(1)).toBe("Used 1 tool");
    expect(en.chat.toolsUsed(46)).toBe("Used 46 tools");
    expect(en.messages.found(1)).toBe("1 message found");
    expect(en.messages.found(0)).toBe("0 messages found");
    expect(en.messages.replies(1)).toBe("1 assistant reply");
    expect(en.stats.costDetail(5, "$0.00")).toBe("5 turns · $0.00/turn avg");
  });

  test("中文插值", () => {
    expect(zh.chat.toolsUsed(46)).toBe("使用了 46 个工具");
    expect(zh.chart.turn(3)).toBe("第 3 轮");
    expect(zh.usage.remaining("711,451")).toBe("剩余 711,451");
  });
});

describe("导出 JSON 按语言取文案", () => {
  const messages = generateMessages();
  const firstUser = messages.find((m) => m.role === "user")!;
  const firstAssistant = messages.find((m) => m.role === "assistant")!;

  test("用户消息文本随语言变化", () => {
    const enRaw = toRawMessage(session, firstUser, "en");
    const zhRaw = toRawMessage(session, firstUser, "zh");
    expect(enRaw.parts[0]).toEqual({ type: "text", text: firstUser.text!.en });
    expect(zhRaw.parts[0]).toEqual({ type: "text", text: firstUser.text!.zh });
    expect(firstUser.text!.en).not.toBe(firstUser.text!.zh);
  });

  test("助手消息与语言无关", () => {
    expect(toRawMessage(session, firstAssistant, "en")).toEqual(toRawMessage(session, firstAssistant, "zh"));
  });

  test("会话导出标题为当前语言的字符串", () => {
    expect(toSessionExport(session, messages, "en").session.title).toBe(session.title.en);
    expect(toSessionExport(session, messages, "zh").session.title).toBe(session.title.zh);
    expect(toSessionExport(session, messages, "en").messages).toHaveLength(223);
  });

  test("缺少文本的用户消息导出为空字符串而不是 undefined", () => {
    const raw = toRawMessage(session, { ...firstUser, text: undefined }, "en");
    expect(raw.parts[0]).toEqual({ type: "text", text: "" });
  });
});
