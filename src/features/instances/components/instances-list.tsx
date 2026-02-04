"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDownIcon } from "lucide-react"

interface InstancesListProps {
  instances: any[]
  loading?: boolean
  onConnect?: (instance: any) => void
  onDisconnect?: (instance: any) => void
  onDelete?: (instance: any) => void
}

export function InstancesList({ instances, loading, onConnect, onDisconnect, onDelete }: InstancesListProps) {
  if (loading) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Carregando instâncias...
        </div>
      </div>
    )
  }

  if (instances.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">Nenhuma instância encontrada ou erro ao carregar.</p>
      </div>
    )
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case "connected":
        return { label: "Conectado e autenticado", variant: "default" as const }
      case "connecting":
        return { label: "Em processo de conexão", variant: "secondary" as const }
      case "disconnected":
      default:
        return { label: "Desconectado do WhatsApp", variant: "destructive" as const }
    }
  }

  const getPhone = (it: any) => {
    const jid = it?.ownerJid ? String(it.ownerJid) : ""
    const fromJid = jid ? jid.replace("@s.whatsapp.net", "") : ""
    const owner = it?.owner ? String(it.owner) : ""
    const raw = fromJid || owner
    const digits = raw.replace(/\D+/g, "")
    return digits || "Sem número"
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      {instances.map((item) => {
        const instance = "instance" in item ? (item as any).instance : (item as any)
        const rawStatus = instance.status ?? instance.connectionStatus ?? ""
        const normalized = rawStatus.toString().toLowerCase().trim()
        const statusKey =
          normalized === "connected" ? "connected" :
          normalized === "connecting" ? "connecting" :
          normalized === "disconnected" ? "disconnected" :
          normalized === "open" ? "connected" :
          (normalized === "close" || normalized === "closed" || normalized === "disconnect" || normalized === "disconect") ? "disconnected" :
          "disconnected"
        const statusConfig = formatStatus(statusKey)
        const isBusiness = !!instance.isBusiness

        return (
          <Card key={instance.instanceId || instance.id || instance.instanceName || instance.name} className="overflow-hidden">
            <CardContent className="p-4 min-h-[96px]">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 ring-1 ring-border bg-white">
                  <AvatarImage className="object-cover" src={instance.profilePicUrl} alt={instance.profileName || instance.instanceName || instance.name} />
                  <AvatarFallback className="bg-muted">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                     <div className="min-w-0">
                       <h3 className="font-semibold truncate text-lg">
                         {instance.instanceName || instance.name}
                       </h3>
                       <p className="text-xs text-muted-foreground truncate">
                         {instance.profileName || instance.adminField01 || ""}
                       </p>
                     </div>
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="outline" size="sm" className="gap-1">
                           Ações <ChevronDownIcon className="h-4 w-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent className="w-48" align="end">
                         <DropdownMenuGroup>
                           {onConnect && statusKey !== "connected" && (
                             <DropdownMenuItem onClick={() => onConnect(instance)}>
                               Conectar
                             </DropdownMenuItem>
                           )}
                           {onDisconnect && statusKey === "connected" && (
                             <DropdownMenuItem onClick={() => onDisconnect(instance)}>
                               Desconectar
                             </DropdownMenuItem>
                           )}
                           {onDelete && (
                             <DropdownMenuItem onClick={() => onDelete(instance)}>
                               Excluir Canal
                             </DropdownMenuItem>
                           )}
                         </DropdownMenuGroup>
                       </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2 font-mono">
                    {getPhone(instance)}
                  </p>

                  <Badge variant={statusConfig.variant} className="text-xs">
                    {statusConfig.label}
                  </Badge>
                  <span className="ml-2">
                    <Badge variant="secondary" className="text-xs">
                      {isBusiness ? "Business" : "Comum"}
                    </Badge>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
