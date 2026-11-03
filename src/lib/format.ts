const TIME_ZONE = "Asia/Shanghai";
const LOCALE = "zh-CN";

const intFormatter = new Intl.NumberFormat(LOCALE);
const compactFormatter = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
const usdFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const clockFormatter = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE });
const clockSecondsFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

export const formatInt = (value: number) => intFormatter.format(value);

export const formatCompact = (value: number) => compactFormatter.format(value);

export const formatSigned = (value: number) => (value > 0 ? `+${formatInt(value)}` : formatInt(value));

export const formatUsd = (value: number) => usdFormatter.format(value);

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

export const formatClock = (ms: number) => clockFormatter.format(ms);

export const formatClockSeconds = (ms: number) => clockSecondsFormatter.format(ms);

export const formatDateTime = (ms: number) => dateTimeFormatter.format(ms);

export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} 分钟`;
  if (minutes === 0) return `${hours} 小时`;
  return `${hours} 小时 ${minutes} 分`;
}

/** 坐标轴用的“整齐上限”：288,549 → 300,000；2,400 → 2,500 */
export function niceCeil(value: number) {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  return (Math.ceil((value / step) * 2) / 2) * step;
}
