"use client";

import { createContext, useContext, type ReactNode } from "react";
import { type Locale, DEFAULT_LOCALE } from "@/lib/i18n";
import type { TranslationDict } from "@/lib/i18n/locales/ko";
import koDict from "@/lib/i18n/locales/ko";

interface I18nContextType {
  locale: Locale;
  t: TranslationDict;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: DEFAULT_LOCALE,
  t: koDict,
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale: "ko", t: koDict, setLocale: () => {} }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
