import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  dictionaries,
  fmt,
  LANGUAGE_STORAGE_KEY,
  type Dictionary,
  type Lang,
} from "@/lib/i18n/dictionary";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Full dictionary for the active language. */
  t: Dictionary;
  /** Interpolates {placeholders} in a translated string. */
  format: (template: string, vars: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLang(value: unknown): value is Lang {
  return value === "en" || value === "hi" || value === "hinglish";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Hindi is the default language for the app; this also matches the
  // first render on the server so hydration stays in sync.
  const [lang, setLangState] = useState<Lang>("hi");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLang(stored)) setLangState(stored);
    } catch {
      /* storage unavailable — stay on Hindi */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "hi";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t: dictionaries[lang], format: fmt }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
