import { Currencies } from "./currencies";

export function dateToUtcDate(date: Date) {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ),
  );
}

// Zod's multipleOf(0.01) tolerates float sums like 0.1 + 0.2; the scaled
// epsilon keeps the same acceptance at large amounts.
export function hasTwoDecimals(value: number) {
  return (
    Number.isFinite(value) &&
    Math.abs(value * 100 - Math.round(value * 100)) <
      Math.max(1e-9, Math.abs(value) * 1e-10)
  );
}

export function getFormatterForCurrency(currency: string) {
  const locale = Currencies.find((c) => c.value === currency)?.locale;

  return {
    format: (value: number) => {
      const formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      });
      return formatter.format(value);
    },
  };
}
