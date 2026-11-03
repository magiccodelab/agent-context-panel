import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Localized } from "../data/mock";
import { createFormatter, DEFAULT_LOCALE, isLocale, type Formatter, type Locale } from "../lib/format";
import { dictionaries, type Messages } from "./messages";

export const LOCALE_STORAGE_KEY = "locale";
const HTML_LANG: Record<Locale, string> = { en: "en", zh: "zh-CN" };

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  f: Formatter;
  /** 取测试数据中按语言提供的文案 */
  pick: (text: Localized) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** 首屏脚本已把语言写入 <html lang>，这里直接读取，保证首帧与持久化偏好一致 */
export function readInitialLocale(): Locale {
  const lang = document.documentElement.lang;
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readInitialLocale());

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
    document.title = dictionaries[locale].documentTitle;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch (error) {
      console.warn("Locale preference could not be saved", error);
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (isLocale(next)) setLocaleState(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: dictionaries[locale], f: createFormatter(locale), pick: (text) => text[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
