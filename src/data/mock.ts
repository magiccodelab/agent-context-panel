import type { Locale } from "../lib/format";

export type Role = "user" | "assistant";
export type ToolKind = "shell" | "read" | "edit" | "write" | "search" | "grep";
/** 测试数据中面向用户的文案，按界面语言取值 */
export type Localized = Record<Locale, string>;

export interface TokenUsage {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface Message {
  id: string;
  role: Role;
  createdAt: number;
  /** 所属对话轮次，从 1 开始 */
  turn: number;
  text?: Localized;
  tokens?: TokenUsage;
  /** 该次请求占用的上下文词元总数（输入 + 输出 + 推理 + 缓存读写） */
  contextTotal?: number;
  /** 相对上一条助手消息的上下文增量 */
  contextDelta?: number;
  tools: ToolKind[];
  finish?: "tool-calls" | "stop";
  cost: number;
}

export interface Session {
  id: string;
  title: Localized;
  workspace: string;
  provider: string;
  model: string;
  contextLimit: number;
  isRunning: boolean;
}

export interface Turn {
  index: number;
  user: Message;
  replies: Message[];
  startedAt: number;
  endedAt: number;
  tokenDelta: number;
}

export const session: Session = {
  id: "ses_demo7f3a91c2",
  title: { en: "Sample session: desktop UI issue triage", zh: "示例会话：桌面端界面问题排查" },
  workspace: "workspace",
  provider: "Provider-A",
  model: "Model-X 4.1 Flash",
  contextLimit: 1_000_000,
  isRunning: true,
};

const START_AT = Date.parse("2026-11-03T12:06:00+08:00");
const END_AT = Date.parse("2026-11-03T13:12:00+08:00");
const START_CONTEXT = 13_840;
/** 最后一次请求的真实构成，其余消息按此反推生成 */
const LAST_USAGE: TokenUsage = { input: 384, output: 214, reasoning: 79, cacheRead: 287_872, cacheWrite: 0 };
const REPLIES_PER_TURN = [38, 52, 41, 47, 40];
const USER_PROMPTS: Localized[] = [
  { en: "The desktop tab bar overflows on narrow windows — find the cause", zh: "桌面端标签栏在窄屏下会溢出，帮我定位原因" },
  { en: "Apply your fix and add a minimal repro", zh: "按你的方案修改，并补一个最小复现" },
  { en: "Turn the repro steps into an issue draft", zh: "把复现步骤整理成 Issue 草稿" },
  { en: "Screenshots need a public repo — write an upload script", zh: "截图需要上传到公开仓库，帮我写个上传脚本" },
  { en: "Update the issue body with the screenshot links", zh: "更新 Issue 正文，附上截图链接" },
];
const TOOL_POOL: ToolKind[] = ["shell", "shell", "shell", "read", "read", "grep", "edit", "write", "search"];
const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const usageTotal = (u: TokenUsage) => u.input + u.output + u.reasoning + u.cacheRead + u.cacheWrite;

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMessages(seed = 20261103): Message[] {
  const random = createRandom(seed);
  const int = (min: number, max: number) => Math.round(min + random() * (max - min));

  let idCounter = 0x19f97b5e600;
  const nextId = () => {
    idCounter += 0x1000 + int(0, 0x7ffff);
    let suffix = "";
    for (let i = 0; i < 14; i++) suffix += ID_CHARS[Math.floor(random() * ID_CHARS.length)];
    return `msg_${idCounter.toString(16)}${suffix}`;
  };

  // 1. 消息序列与时间：先生成相对间隔，再整体缩放到会话起止时间
  const skeleton: { role: Role; turn: number }[] = [];
  REPLIES_PER_TURN.forEach((replies, i) => {
    skeleton.push({ role: "user", turn: i + 1 });
    for (let r = 0; r < replies; r++) skeleton.push({ role: "assistant", turn: i + 1 });
  });
  const gaps = skeleton.map((m, i) => (i === 0 ? 0 : m.role === "user" ? int(90, 240) : int(4, 32)));
  const gapSum = gaps.reduce((a, b) => a + b, 0);
  let elapsed = 0;
  const times = gaps.map((g) => {
    elapsed += g;
    return Math.round(START_AT + (elapsed / gapSum) * (END_AT - START_AT));
  });

  // 2. 上下文增长：读文件、搜索时会出现较大跳变
  const assistantCount = skeleton.filter((m) => m.role === "assistant").length;
  const rawIncrements = skeleton
    .filter((m) => m.role === "assistant")
    .map((_, i) => (i === 0 ? 0 : random() < 0.12 ? int(3000, 9000) : int(300, 1700)));
  const finalTotal = usageTotal(LAST_USAGE);
  const rawSum = rawIncrements.reduce((a, b) => a + b, 0);
  const scale = (finalTotal - START_CONTEXT) / rawSum;
  let running = START_CONTEXT;
  const totals = rawIncrements.map((inc, i) => {
    running += Math.round(inc * scale);
    return i === assistantCount - 1 ? finalTotal : running;
  });

  // 3. 组装消息
  let assistantIndex = 0;
  let previousTotal = START_CONTEXT;
  return skeleton.map((m, i): Message => {
    const createdAt = times[i]!;
    if (m.role === "user") {
      return { id: nextId(), role: "user", createdAt, turn: m.turn, text: USER_PROMPTS[m.turn - 1], tools: [], cost: 0 };
    }

    const total = totals[assistantIndex]!;
    const isLast = assistantIndex === assistantCount - 1;
    const isTurnEnd = skeleton[i + 1]?.role !== "assistant";
    let tokens: TokenUsage;
    if (isLast) {
      tokens = { ...LAST_USAGE };
    } else {
      const output = random() < 0.08 ? int(1200, 2400) : int(40, 900);
      const reasoning = random() < 0.6 ? int(0, 420) : 0;
      const input = int(80, 980);
      tokens = { input, output, reasoning, cacheWrite: 0, cacheRead: Math.max(0, total - input - output - reasoning) };
    }

    const toolCount = isTurnEnd ? 0 : random() < 0.25 ? 2 : 1;
    const tools = Array.from({ length: toolCount }, () => TOOL_POOL[Math.floor(random() * TOOL_POOL.length)]!);
    const delta = assistantIndex === 0 ? total - START_CONTEXT : total - previousTotal;
    previousTotal = total;
    assistantIndex++;

    return {
      id: nextId(),
      role: "assistant",
      createdAt,
      turn: m.turn,
      tokens,
      contextTotal: usageTotal(tokens),
      contextDelta: delta,
      tools: [...new Set(tools)],
      finish: isTurnEnd ? "stop" : "tool-calls",
      cost: 0,
    };
  });
}

export function groupTurns(messages: Message[]): Turn[] {
  const turns: Turn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ index: message.turn, user: message, replies: [], startedAt: message.createdAt, endedAt: message.createdAt, tokenDelta: 0 });
      continue;
    }
    const turn = turns[turns.length - 1];
    if (!turn) continue;
    turn.replies.push(message);
    turn.endedAt = message.createdAt;
    turn.tokenDelta += message.contextDelta ?? 0;
  }
  return turns;
}

export interface SessionStats {
  messageCount: number;
  userCount: number;
  assistantCount: number;
  contextTotal: number;
  usage: number;
  remaining: number;
  lastUsage: TokenUsage;
  cacheHitRate: number;
  totalCost: number;
  createdAt: number;
  lastActiveAt: number;
  /** 按最近 30 条助手消息的平均增速估算，还能容纳多少条消息 */
  estimatedRemainingMessages: number;
}

export function computeStats(current: Session, messages: Message[]): SessionStats {
  const assistants = messages.filter((m) => m.role === "assistant" && m.tokens);
  const last = assistants[assistants.length - 1];
  const lastUsage = last?.tokens ?? { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 };
  const contextTotal = usageTotal(lastUsage);
  const remaining = Math.max(0, current.contextLimit - contextTotal);
  const recent = assistants.slice(-30);
  const recentGrowth = recent.reduce((sum, m) => sum + Math.max(0, m.contextDelta ?? 0), 0) / Math.max(1, recent.length);
  const cacheBase = lastUsage.cacheRead + lastUsage.input;

  return {
    messageCount: messages.length,
    userCount: messages.length - assistants.length,
    assistantCount: assistants.length,
    contextTotal,
    usage: current.contextLimit > 0 ? contextTotal / current.contextLimit : 0,
    remaining,
    lastUsage,
    cacheHitRate: cacheBase > 0 ? lastUsage.cacheRead / cacheBase : 0,
    totalCost: messages.reduce((sum, m) => sum + m.cost, 0),
    createdAt: messages[0]?.createdAt ?? 0,
    lastActiveAt: messages[messages.length - 1]?.createdAt ?? 0,
    estimatedRemainingMessages: recentGrowth > 0 ? Math.floor(remaining / recentGrowth) : Infinity,
  };
}

export const messages = generateMessages();
export const turns = groupTurns(messages);
export const stats = computeStats(session, messages);
