import { describe, expect, test } from "bun:test";
import { exportFilename, sessionExportPayload, toMarkdownTranscript } from "./export";
import { generateMessages, groupTurns, session } from "./mock";

const messages = generateMessages();
const turns = groupTurns(messages);

describe("Markdown 会话导出", () => {
  const markdown = toMarkdownTranscript(session, messages, "en");

  test("只保留对话正文，不含工具与词元明细", () => {
    expect(markdown).toContain(`# ${session.title.en}`);
    expect(markdown).toContain("## User");
    expect(markdown).toContain("## Assistant");
    expect(markdown).not.toContain("cacheRead");
    expect(markdown).not.toContain("contextDelta");
    expect(markdown).not.toContain("tool-calls");
  });

  test("每个用户提问都出现，且顺序与会话一致", () => {
    const prompts = turns.map((turn) => turn.user.text!.en);
    let cursor = -1;
    for (const prompt of prompts) {
      const at = markdown.indexOf(prompt);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  test("按语言取文案", () => {
    const zh = toMarkdownTranscript(session, messages, "zh");
    expect(zh).toContain(`# ${session.title.zh}`);
    expect(zh).toContain(turns[0]!.user.text!.zh);
    expect(zh).not.toContain(turns[0]!.user.text!.en);
  });

  test("Markdown 明显短于完整 JSON", () => {
    const json = sessionExportPayload(session, messages, "en", "json").content;
    expect(markdown.length).toBeLessThan(json.length);
  });

  test("导出文件名带扩展名", () => {
    expect(exportFilename(session, "json")).toBe(`${session.id}.json`);
    expect(exportFilename(session, "markdown")).toBe(`${session.id}.md`);
  });

  test("空助手消息不会留下空标题", () => {
    const [first] = messages;
    const onlyUser = toMarkdownTranscript(session, [first!], "en");
    expect(onlyUser).not.toContain("## Assistant");
  });
});
