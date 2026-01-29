"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { THEME_PRESET_OPTIONS } from "@/types/preferences/theme"
import { updateThemePreset } from "@/lib/theme-utils"

export function ThemeSelector() {
  const [theme, setTheme] = useState<string>("default")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("themePreset") || "default"
      setTheme(saved)
      updateThemePreset(saved)
    } catch {}
  }, [])

  const handleChange = (value: string) => {
    setTheme(value)
    updateThemePreset(value)
  }

  return (
    <div className="flex items-center gap-3">
      <Label className="text-xs font-medium">Tema</Label>
      <Select value={theme} onValueChange={handleChange}>
        <SelectTrigger className="w-40 text-xs">
          <SelectValue placeholder="Selecione o tema" />
        </SelectTrigger>
        <SelectContent>
          {THEME_PRESET_OPTIONS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value} className="text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: preset.primary.light }}
                />
                {preset.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
