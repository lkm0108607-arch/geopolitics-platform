export type Locale = "ko";

export const LOCALES: { code: Locale; name: string; flag: string }[] = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
];

export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_STORAGE_KEY = "geoinsight_locale";
