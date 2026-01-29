"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Instance } from "../services/evolution-api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, RefreshCw, Wifi, WifiOff } from "lucide-react"

interface InstancesListProps {
  instances: Instance[]
}

export function InstancesList({ instances }: InstancesListProps) {
  if (instances.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">Nenhuma instância encontrada ou erro ao carregar.</p>
      </div>
    )
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case "open":
        return { label: "Conectado", variant: "default" as const, color: "text-green-500", icon: Wifi }
      case "connecting":
        return { label: "Conectando", variant: "secondary" as const, color: "text-yellow-500", icon: RefreshCw }
      case "close":
      default:
        return { label: "Desconectado", variant: "destructive" as const, color: "text-red-500", icon: WifiOff }
    }
  }

  const formatPhoneNumber = (jid?: string) => {
    if (!jid) return "Sem número"
    return jid.replace("@s.whatsapp.net", "")
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      {instances.map((item) => {
        const instance = "instance" in item ? (item as any).instance : (item as any)
        const rawStatus = instance.connectionStatus ?? instance.status ?? ""
        const normalized = rawStatus.toString().toLowerCase().trim()
        const statusKey =
          normalized === "open" ? "open" :
          normalized === "connection" || normalized === "connecting" ? "connecting" :
          normalized === "disconect" || normalized === "disconnect" || normalized === "close" || normalized === "closed" ? "close" :
          normalized
        const statusConfig = formatStatus(statusKey)
        const StatusIcon = statusConfig.icon

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
                     <h3 className="font-semibold truncate text-lg">
                        {instance.profileName || instance.instanceName || instance.name}
                     </h3>
                     <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2 font-mono">
                    {formatPhoneNumber(instance.ownerJid)}
                  </p>

                  <Badge variant={statusConfig.variant} className="text-xs">
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
