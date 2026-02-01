"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  FileText, 
  ImageIcon, 
  VideoIcon,
  Pencil,
  Trash,
  Power
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"

import { templateService, MessageTemplate } from "@/features/templates/services/template.service"
import { toast } from "sonner"

export default function ModelosPage() {
  const router = useRouter()
  const [templates, setTemplates] = React.useState<MessageTemplate[]>([])
  const [search, setSearch] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const data = await templateService.getTemplates()
      setTemplates(data)
    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar modelos")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadTemplates()
  }, [])

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este modelo?")) {
        try {
            await templateService.deleteTemplate(id)
            toast.success("Modelo excluído")
            loadTemplates()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao excluir modelo")
        }
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
        await templateService.toggleStatus(id, currentStatus)
        toast.success("Status atualizado")
        loadTemplates()
    } catch (error) {
        console.error(error)
        toast.error("Erro ao atualizar status")
    }
  }

  const filtered = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Modelos de mensagens</h2>
            <p className="text-muted-foreground">Gerencie seus modelos de mensagens para campanhas.</p>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Criar modelo
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Escolha o tipo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/modelos/texto")}>
                    <FileText className="mr-2 h-4 w-4" /> Texto
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                    <ImageIcon className="mr-2 h-4 w-4" /> Imagem (Em breve)
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                    <VideoIcon className="mr-2 h-4 w-4" /> Vídeo (Em breve)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center space-x-2">
        <Input 
            placeholder="Pesquisar..." 
            className="max-w-sm" 
            value={search}
            onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome do modelo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Última edição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                Carregando modelos...
                            </TableCell>
                        </TableRow>
                    ) : filtered.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                Nenhum modelo encontrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filtered.map(t => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.name}</TableCell>
                                <TableCell>{t.category}</TableCell>
                                <TableCell>
                                    <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className={t.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                                        {t.status === 'active' ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{new Date(t.last_modified || t.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => router.push(`/modelos/texto?id=${t.id}`)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleToggleStatus(t.id, t.status)}>
                                                <Power className="mr-2 h-4 w-4" /> {t.status === 'active' ? 'Desativar' : 'Ativar'}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(t.id)}>
                                                <Trash className="mr-2 h-4 w-4" /> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}
