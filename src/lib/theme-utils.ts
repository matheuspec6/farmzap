"use client"

export function updateThemePreset(value: string) {
  document.documentElement.setAttribute("data-theme-preset", value)
  try {
    localStorage.setItem("themePreset", value)
  } catch {}
}
