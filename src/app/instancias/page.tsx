import { evolutionService } from "@/features/instances/services/evolution-api"
import { InstancesList } from "@/features/instances/components/instances-list"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function InstanciasPage() {
  const instances = await evolutionService.fetchInstances()

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Canais de Atendimento</h2>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nova Instância
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
         <p className="text-muted-foreground">
            Gerencie suas conexões com o WhatsApp.
         </p>
      </div>

      <InstancesList instances={instances} />
    </div>
  )
}
