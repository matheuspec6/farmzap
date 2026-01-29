"use client"
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/layout/user-nav"
import {
  LayoutDashboard,
  Users,
  BarChart,
  Folder,
  FileText,
  Database,
  ClipboardList,
  Leaf,
  PlusCircle,
  Settings,
  MessageSquare,
  Smartphone,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import Link from "next/link"

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const [collapsed, setCollapsed] = React.useState<boolean>(false)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("sidebarCollapsed")
      setCollapsed(raw === "true")
    } catch {}
  }, [])
  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem("sidebarCollapsed", String(next)) } catch {}
      return next
    })
  }

  const iconCls = collapsed ? "h-7 w-7" : "h-4 w-4"

  return (
    <div className={cn(`pb-12 ${collapsed ? "w-16" : "w-64"} border-r min-h-screen bg-background hidden md:flex flex-col justify-between`, className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between px-2 mb-6">
            <div className="flex items-center">
              <Leaf className={cn("mr-0 text-primary", iconCls)} />
              {!collapsed && <h2 className="ml-2 text-xl font-bold tracking-tight">FarmZap</h2>}
            </div>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label={collapsed ? "Expandir navbar" : "Colapsar navbar"}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          <div className="px-2 mb-4">
             <Link href="/envios/novo">
               <Button className={cn("bg-primary text-primary-foreground hover:bg-primary/90", collapsed ? "w-10 h-10 p-0 justify-center" : "w-full justify-start gap-2")}>
                  <PlusCircle className={iconCls} />
                  {!collapsed && "Novo Envio"}
               </Button>
             </Link>
          </div>
          <div className="space-y-1">
            <Link href="/">
              <Button variant="ghost" className={cn("w-full", collapsed ? "justify-center" : "justify-start")}>
                <LayoutDashboard className={cn(iconCls, collapsed ? "" : "mr-2")} />
                {!collapsed && "Dashboard"}
              </Button>
            </Link>
            <Link href="/envios">
              <Button variant="ghost" className={cn("w-full", collapsed ? "justify-center" : "justify-start")}>
                <MessageSquare className={cn(iconCls, collapsed ? "" : "mr-2")} />
                {!collapsed && "Gerenciador de envios"}
              </Button>
            </Link>
            <Link href="/contatos">
              <Button variant="ghost" className={cn("w-full", collapsed ? "justify-center" : "justify-start")}>
                <Users className={cn(iconCls, collapsed ? "" : "mr-2")} />
                {!collapsed && "Contatos"}
              </Button>
            </Link>
            <Button variant="ghost" className={cn("w-full", collapsed ? "justify-center" : "justify-start")}>
              <BarChart className={cn(iconCls, collapsed ? "" : "mr-2")} />
              {!collapsed && "Relatórios"}
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          {!collapsed && (
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Gerenciamento
            </h2>
          )}
          <div className="space-y-1">
            <Link href="/instancias">
              <Button variant="ghost" className={cn("w-full", collapsed ? "justify-center" : "justify-start")}>
                <Smartphone className={cn(iconCls, collapsed ? "" : "mr-2")} />
                {!collapsed && "Canais de atendimento"}
              </Button>
            </Link>
            <Button variant="ghost" className={cn("w-full", collapsed ? "justify-center" : "justify-start")}>
              <FileText className={cn(iconCls, collapsed ? "" : "mr-2")} />
              {!collapsed && "Modelos"}
            </Button>
            <Button variant="ghost" className={cn("w-full", collapsed ? "justify-center" : "justify-start")}>
              <Database className={cn(iconCls, collapsed ? "" : "mr-2")} />
              {!collapsed && "Base de Dados"}
            </Button>
             <Button variant="ghost" className={cn("w-full", collapsed ? "justify-center" : "justify-start")}>
              <Settings className={cn(iconCls, collapsed ? "" : "mr-2")} />
              {!collapsed && "Configurações"}
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 border-t">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <UserNav />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">Matheus Silva</span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
