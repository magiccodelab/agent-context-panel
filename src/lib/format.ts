export type Locale = "en" | "zh";

export const LOCALES: Locale[] = ["en", "zh"];
export const DEFAULT_LOCALE: Locale = "en";

const INTL_LOCALE: Record<Locale, string> = { en: "en-US", zh: "zh-CN" };
const TIME_ZONE = "Asia/Shanghai";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh";
}

/**
 * 0.2885 → "29%"。接近 0 或 100% 的值保留一位小数，避免 99.8% 被四舍五入成 100%；
 * 极小的非零占比显示为 "<0.1%"，与真正的 0% 区分
 */
export function formatPercent(ratio: number, fractionDigits?: number) {
  const pct = ratio * 100;
  if (fractionDigits === undefined && pct > 0 && pct < 0.1) return "<0.1%";
  const isNearEdge = (pct > 0 && pct < 10) || (pct > 90 && pct < 100);
  const digits = fractionDigits ?? (isNearEdge ? 1 : 0);
  return `${pct.toFixed(digits)}%`;
}

/** 坐标轴用的“整齐上限”：288,549 → 300,000；2,400 → 2,500 */
export function niceCeil(value: number) {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  return (Math.ceil((value / step) * 2) / 2) * step;
}

const DURATION_UNITS: Record<Locale, { h: (n: number) => string; m: (n: number) => string; hm: (h: number, m: number) => string }> = {
  en: { h: (n) => `${n}h`, m: (n) => `${n} min`, hm: (h, m) => `${h}h ${m}m` },
  zh: { h: (n) => `${n} 小时`, m: (n) => `${n} 分钟`, hm: (h, m) => `${h} 小时 ${m} 分` },
};

export type Formatter = ReturnType<typeof createFormatter>;

/** 按语言创建一组格式化函数；Intl 实例只在创建时构造一次 */
export function createFormatter(locale: Locale) {
  const tag = INTL_LOCALE[locale];
  const int = new Intl.NumberFormat(tag);
  const compact = new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 });
  const usd = new Intl.NumberFormat(tag, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  const clock = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE });
  const clockSeconds = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE });
  // 日期与时间分开格式化再拼接：不同 ICU 版本的连接词（", " / " at "）不一致
  const date = new Intl.DateTimeFormat(tag, {
    year: "numeric",
    month: locale === "zh" ? "long" : "short",
    day: "numeric",
    timeZone: TIME_ZONE,
  });
  const dateTimeSeparator = locale === "zh" ? " " : ", ";
  const units = DURATION_UNITS[locale];

  return {
    locale,
    int: (value: number) => int.format(value),
    compact: (value: number) => compact.format(value),
    signed: (value: number) => (value > 0 ? `+${int.format(value)}` : int.format(value)),
    usd: (value: number) => usd.format(value),
    percent: formatPercent,
    clock: (ms: number) => clock.format(ms),
    clockSeconds: (ms: number) => clockSeconds.format(ms),
    dateTime: (ms: number) => `${date.format(ms)}${dateTimeSeparator}${clock.format(ms)}`,
    duration: (ms: number) => {
      const totalMinutes = Math.max(0, Math.round(ms / 60_000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours === 0) return units.m(minutes);
      if (minutes === 0) return units.h(hours);
      return units.hm(hours, minutes);
    },
  };
}
