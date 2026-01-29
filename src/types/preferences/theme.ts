export const THEME_PRESET_OPTIONS = [
  {
    label: "Default",
    value: "default",
    primary: { light: "hsl(222.2 47.4% 11.2%)", dark: "hsl(210 40% 98%)" },
  },
  {
    label: "Blue",
    value: "blue",
    primary: { light: "hsl(217.2 91.2% 59.8%)", dark: "hsl(212.7 26.8% 83.9%)" },
  },
  {
    label: "Green",
    value: "green",
    primary: { light: "hsl(142.1 76.2% 36.3%)", dark: "hsl(142.8 24% 75%)" },
  },
  {
    label: "Red",
    value: "red",
    primary: { light: "hsl(0 84% 60%)", dark: "hsl(0 62% 70%)" },
  },
  {
    label: "Orange",
    value: "orange",
    primary: { light: "hsl(24 94% 50%)", dark: "hsl(24 65% 70%)" },
  },
  {
    label: "Yellow",
    value: "yellow",
    primary: { light: "hsl(50 94% 50%)", dark: "hsl(50 70% 70%)" },
  },
  {
    label: "Violet",
    value: "violet",
    primary: { light: "hsl(272 84% 60%)", dark: "hsl(272 50% 75%)" },
  },
  {
    label: "Rose",
    value: "rose",
    primary: { light: "hsl(347 77% 53%)", dark: "hsl(347 60% 75%)" },
  },
  {
    label: "Sapphire",
    value: "sapphire",
    primary: { light: "hsl(210 80% 45%)", dark: "hsl(210 50% 75%)" },
  },
  {
    label: "Tangerine",
    value: "tangerine",
    primary: { light: "hsl(32 100% 50%)", dark: "hsl(32 70% 70%)" },
  },
  {
    label: "Soft Pop",
    value: "soft-pop",
    primary: { light: "hsl(280 65% 62%)", dark: "hsl(280 40% 75%)" },
  },
  {
    label: "Brutalist",
    value: "brutalist",
    primary: { light: "hsl(0 0% 10%)", dark: "hsl(0 0% 90%)" },
  },
] as const

export type ThemePreset = (typeof THEME_PRESET_OPTIONS)[number]["value"]
