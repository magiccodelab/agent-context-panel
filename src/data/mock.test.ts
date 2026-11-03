import { describe, expect, test } from "bun:test";
import { computeStats, generateMessages, groupTurns, session, usageTotal, type Message } from "./mock";

describe("mock 会话数据", () => {
  const messages = generateMessages();
  const turns = groupTurns(messages);
  const stats = computeStats(session, messages);

  test("消息数量与角色分布", () => {
    expect(messages.length).toBe(223);
    expect(stats.userCount).toBe(5);
    expect(stats.assistantCount).toBe(218);
    expect(turns.length).toBe(5);
    expect(turns.reduce((n, t) => n + t.replies.length + 1, 0)).toBe(223);
  });

  test("最后一次请求的词元构成与总数一致", () => {
    expect(stats.lastUsage).toEqual({ input: 384, output: 214, reasoning: 79, cacheRead: 287_872, cacheWrite: 0 });
    expect(stats.contextTotal).toBe(288_549);
    expect(stats.remaining).toBe(1_000_000 - 288_549);
    expect(stats.usage).toBeCloseTo(0.288549, 6);
  });

  test("每条助手消息 contextTotal 等于各项词元之和，且整体单调不减", () => {
    const assistants = messages.filter((m) => m.role === "assistant");
    for (const m of assistants) {
      expect(m.tokens).toBeDefined();
      expect(m.contextTotal).toBe(usageTotal(m.tokens!));
      expect(m.tokens!.cacheRead).toBeGreaterThanOrEqual(0);
    }
    const totals = assistants.map((m) => m.contextTotal!);
    for (let i = 1; i < totals.length; i++) expect(totals[i]!).toBeGreaterThanOrEqual(totals[i - 1]!);
  });

  test("时间范围落在会话起止时间内并按顺序递增", () => {
    expect(stats.createdAt).toBe(Date.parse("2026-11-03T12:06:00+08:00"));
    expect(stats.lastActiveAt).toBe(Date.parse("2026-11-03T13:12:00+08:00"));
    for (let i = 1; i < messages.length; i++) expect(messages[i]!.createdAt).toBeGreaterThanOrEqual(messages[i - 1]!.createdAt);
  });

  test("相同种子生成结果稳定，ID 唯一", () => {
    expect(generateMessages().map((m) => m.id)).toEqual(messages.map((m) => m.id));
    expect(new Set(messages.map((m) => m.id)).size).toBe(messages.length);
    expect(messages.every((m) => /^msg_[0-9a-f]{11,}[A-Za-z0-9]{14}$/.test(m.id))).toBe(true);
  });

  test("缓存命中率与估算剩余消息", () => {
    expect(stats.cacheHitRate).toBeCloseTo(287_872 / (287_872 + 384), 6);
    expect(stats.estimatedRemainingMessages).toBeGreaterThan(0);
    expect(Number.isFinite(stats.estimatedRemainingMessages)).toBe(true);
  });
});

describe("边界：空会话与缺省值", () => {
  test("没有消息时统计不抛错且为零值", () => {
    const empty = computeStats(session, []);
    expect(empty.messageCount).toBe(0);
    expect(empty.contextTotal).toBe(0);
    expect(empty.usage).toBe(0);
    expect(empty.cacheHitRate).toBe(0);
    expect(empty.estimatedRemainingMessages).toBe(Infinity);
  });

  test("上下文上限为 0 时使用率为 0 而不是 NaN", () => {
    const stats = computeStats({ ...session, contextLimit: 0 }, generateMessages());
    expect(stats.usage).toBe(0);
    expect(stats.remaining).toBe(0);
  });

  test("首条为助手消息时分组会忽略孤立回复", () => {
    const orphan: Message = { id: "msg_x", role: "assistant", createdAt: 0, turn: 0, tools: [], cost: 0, contextDelta: 10 };
    expect(groupTurns([orphan])).toEqual([]);
  });
});
