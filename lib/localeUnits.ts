import type { Locale } from "@/lib/i18n";

// ─── Locale currency config (Korean only) ──────────────────────────────────
interface LocaleCurrencyConfig {
  symbol: string;
  code: string;
  locale: string;
  formatLarge: (n: number) => string;
  format: (n: number) => string;
}

const currencyConfigs: Record<Locale, LocaleCurrencyConfig> = {
  ko: {
    symbol: "₩",
    code: "KRW",
    locale: "ko-KR",
    formatLarge: (n: number) => {
      if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(1) + "억원";
      if (Math.abs(n) >= 10000) return (n / 10000).toFixed(0) + "만원";
      return n.toLocaleString("ko-KR") + "원";
    },
    format: (n: number) => n.toLocaleString("ko-KR") + "원",
  },
};

// ─── Main formatting function ────────────────────────────────────────────────
export function formatValueLocale(value: number, unit: string, locale: Locale): string {
  const decimals = unit === "%" ? 2 : 0;
  const formatted = decimals > 0
    ? value.toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : value.toLocaleString("ko-KR", { maximumFractionDigits: 0 });

  switch (unit) {
    case "%": return formatted + "%";
    case "pt": return formatted;
    case "지수": return formatted;
    case "원/3.75g": return formatted + "원/3.75g";
    case "원/리터": return formatted + "원/리터";
    case "원/kg": return formatted + "원/kg";
    case "원": return formatted + "원";
    case "엔": return formatted + "엔";
    default: return formatted + " " + unit;
  }
}

// ─── Format large currency amounts (for simulation, portfolios) ─────────────
export function formatCurrency(n: number | null | undefined, locale: Locale): string {
  if (n == null || isNaN(n)) return "₩0";
  return currencyConfigs.ko.formatLarge(n);
}

// ─── Format number with locale ──────────────────────────────────────────────
export function formatNumber(n: number | null | undefined, locale: Locale): string {
  if (n == null || isNaN(n)) return "0";
  return n.toLocaleString("ko-KR");
}

// ─── Get currency symbol ────────────────────────────────────────────────────
export function getCurrencySymbol(locale: Locale): string {
  return "₩";
}

// ─── Get initial simulation capital ──────────────────────────────────────────
export function getInitialCapital(locale: Locale): { amount: number; display: string } {
  return { amount: 100000000, display: "1억원" };
}

// ─── Convert KRW price for display ──────────────────────────────────────────
export function convertPrice(krwPrice: number, locale: Locale): number {
  return krwPrice;
}

// ─── Get unit label for asset display ───────────────────────────────────────
export function getUnitLabel(originalUnit: string, locale: Locale): string {
  return originalUnit;
}

// ─── Export for other uses ──────────────────────────────────────────────────
export { currencyConfigs };
