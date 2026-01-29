"use client"

import * as React from "react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import { ThemeSelector } from "@/components/layout-controls"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"
  const pathname = usePathname()
  const title =
    ({
      "/": "Dashboard",
      "/envios": "Envios",
      "/envios/novo": "Novo Envio",
      "/instancias": "Instâncias",
      "/testes/conexoes": "Testes de Conexão",
    } as Record<string, string>)[pathname] ?? "Dashboard"

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-2">
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <SidebarTrigger className="-ml-1" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="h-8 w-8"
          >
            {mounted && (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
            <span className="sr-only">Alternar modo</span>
          </Button>
          <ThemeSelector />
        </div>
      </div>
    </header>
  )
}
