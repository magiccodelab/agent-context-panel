import { describe, expect, test } from "bun:test";
import { createFormatter, formatPercent, isLocale, niceCeil } from "./format";

const t = Date.parse("2026-11-03T12:06:00+08:00");

describe("format · en", () => {
  const f = createFormatter("en");

  test("数字", () => {
    expect(f.int(288549)).toBe("288,549");
    expect(f.compact(288549)).toBe("288.5K");
    expect(f.compact(1_000_000)).toBe("1M");
    expect(f.signed(1234)).toBe("+1,234");
    expect(f.signed(0)).toBe("0");
    expect(f.usd(0)).toBe("$0.00");
  });

  test("时间（固定东八区）与时长", () => {
    expect(f.clock(t)).toBe("12:06");
    expect(f.dateTime(t)).toBe("Nov 3, 2026, 12:06");
    expect(f.duration(66 * 60_000)).toBe("1h 6m");
    expect(f.duration(45 * 60_000)).toBe("45 min");
    expect(f.duration(120 * 60_000)).toBe("2h");
  });
});

describe("format · zh", () => {
  const f = createFormatter("zh");

  test("数字", () => {
    expect(f.int(288549)).toBe("288,549");
    expect(f.compact(288549)).toBe("28.9万");
    expect(f.compact(1_000_000)).toBe("100万");
    expect(f.usd(0)).toBe("US$0.00");
  });

  test("时间与时长", () => {
    expect(f.clock(t)).toBe("12:06");
    expect(f.dateTime(t)).toBe("2026年11月3日 12:06");
    expect(f.duration(66 * 60_000)).toBe("1 小时 6 分");
    expect(f.duration(45 * 60_000)).toBe("45 分钟");
    expect(f.duration(120 * 60_000)).toBe("2 小时");
    expect(f.duration(-5)).toBe("0 分钟");
  });
});

describe("format · 通用", () => {
  test("百分比：小值与接近 100% 的值保留一位小数", () => {
    expect(formatPercent(0.288549)).toBe("29%");
    expect(formatPercent(0.0013)).toBe("0.1%");
    expect(formatPercent(0.00027)).toBe("<0.1%");
    expect(formatPercent(0.9977)).toBe("99.8%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.99867, 1)).toBe("99.9%");
  });

  test("坐标轴整齐上限", () => {
    expect(niceCeil(288549)).toBe(300000);
    expect(niceCeil(2400)).toBe(2500);
    expect(niceCeil(0)).toBe(1);
  });

  test("语言值校验", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("zh-CN")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
