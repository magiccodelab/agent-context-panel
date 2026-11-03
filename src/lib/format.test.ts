import { describe, expect, test } from "bun:test";
import { formatClock, formatCompact, formatDateTime, formatDuration, formatInt, formatPercent, formatSigned, formatUsd, niceCeil } from "./format";

describe("format", () => {
  test("整数与紧凑数字", () => {
    expect(formatInt(288549)).toBe("288,549");
    expect(formatCompact(288549)).toBe("28.9万");
    expect(formatCompact(1_000_000)).toBe("100万");
    expect(formatSigned(1234)).toBe("+1,234");
    expect(formatSigned(0)).toBe("0");
  });

  test("百分比：小值与接近 100% 的值保留一位小数", () => {
    expect(formatPercent(0.288549)).toBe("29%");
    expect(formatPercent(0.0013)).toBe("0.1%");
    expect(formatPercent(0.00027)).toBe("<0.1%");
    expect(formatPercent(0.9977)).toBe("99.8%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.99867, 1)).toBe("99.9%");
  });

  test("金额与时间（固定东八区）", () => {
    expect(formatUsd(0)).toBe("US$0.00");
    const t = Date.parse("2026-11-03T12:06:00+08:00");
    expect(formatClock(t)).toBe("12:06");
    expect(formatDateTime(t)).toBe("2026年11月3日 12:06");
  });

  test("时长", () => {
    expect(formatDuration(66 * 60_000)).toBe("1 小时 6 分");
    expect(formatDuration(45 * 60_000)).toBe("45 分钟");
    expect(formatDuration(120 * 60_000)).toBe("2 小时");
    expect(formatDuration(-5)).toBe("0 分钟");
  });

  test("坐标轴整齐上限", () => {
    expect(niceCeil(288549)).toBe(300000);
    expect(niceCeil(2400)).toBe(2500);
    expect(niceCeil(0)).toBe(1);
  });
});
