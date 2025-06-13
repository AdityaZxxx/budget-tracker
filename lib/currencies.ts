export const Currencies = [
  { value: "USD", label: "🇺🇸 Dollar", locale: "en-US" },
  { value: "EUR", label: "🇪🇺 Euro", locale: "de-DE" },
  { value: "JYP", label: "🇯🇵 Yen", locale: "ja-JP" },
  { value: "idr", label: "🇮🇩 Rupiah", locale: "id-ID" },
];

export type Currency = (typeof Currencies)[0];
