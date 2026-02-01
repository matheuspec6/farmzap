"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { contactService, Tag } from "@/features/contacts/services/contact.service"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

export default function EtiquetasPage() {
  const [tags, setTags] = React.useState<Tag[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isOpen, setIsOpen] = React.useState(false)
  const [editingTag, setEditingTag] = React.useState<Tag | null>(null)
  const [formData, setFormData] = React.useState({ name: "", description: "", color: "#000000" })
  const [isSaving, setIsSaving] = React.useState(false)
  
  // Multi-selection state
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])

  const loadTags = async () => {
    setIsLoading(true)
    try {
        const data = await contactService.getTags()
        setTags(data)
    } catch (error) {
        console.error(error)
        toast.error("Erro ao carregar etiquetas")
    } finally {
        setIsLoading(false)
    }
  }

  // Load tags
  React.useEffect(() => {
    loadTags()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
        if (editingTag) {
            await contactService.updateTag(editingTag.id, formData)
            toast.success("Etiqueta atualizada")
        } else {
            await contactService.createTag(formData)
            toast.success("Etiqueta criada")
        }
        await loadTags()
        setIsOpen(false)
        setEditingTag(null)
        setFormData({ name: "", description: "", color: "#000000" })
    } catch (error) {
        console.error(error)
        toast.error("Erro ao salvar etiqueta")
    } finally {
        setIsSaving(false)
    }
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, description: tag.description || "", color: tag.color || "#000000" })
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta etiqueta?")) {
        try {
            await contactService.deleteTag(id)
            toast.success("Etiqueta removida")
            loadTags()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao remover etiqueta")
        }
    }
  }

  const openNew = () => {
      setEditingTag(null)
      setFormData({ name: "", description: "", color: "#000000" })
      setIsOpen(true)
  }

  const toggleSelectAll = () => {
    if (selectedTags.length === tags.length) {
        setSelectedTags([])
    } else {
        setSelectedTags(tags.map(t => t.id))
    }
  }

  const toggleSelectTag = (id: string) => {
    setSelectedTags(prev => {
        if (prev.includes(id)) {
            return prev.filter(item => item !== id)
        } else {
            return [...prev, id]
        }
    })
  }

  const handleBulkDelete = async () => {
    if (confirm(`Tem certeza que deseja excluir ${selectedTags.length} etiquetas?`)) {
        setIsLoading(true)
        try {
            await contactService.bulkDeleteTags(selectedTags)
            toast.success("Etiquetas removidas")
            setSelectedTags([])
            loadTags()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao remover etiquetas")
            setIsLoading(false)
        }
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Etiquetas</h2>
            <p className="text-muted-foreground mt-2">
                As etiquetas ajudam você a categorizar e priorizar conversas e leads. Você pode atribuir uma etiqueta a uma conversa ou contato usando o painel lateral.
            </p>
        </div>
        <div className="flex gap-2">
            {selectedTags.length > 0 && (
                <Button variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir ({selectedTags.length})
                </Button>
            )}
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar etiqueta
            </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox 
                        checked={tags.length > 0 && selectedTags.length === tags.length}
                        onCheckedChange={toggleSelectAll}
                    />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Carregando...</span>
                      </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                {tags.map((tag) => (
                    <TableRow key={tag.id}>
                    <TableCell>
                        <Checkbox 
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={() => toggleSelectTag(tag.id)}
                        />
                    </TableCell>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell>{tag.description}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }} />
                            <span className="text-muted-foreground uppercase">{tag.color}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tag)}>
                        <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tag.id)}>
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                {tags.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhuma etiqueta encontrada.
                        </TableCell>
                    </TableRow>
                )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "Editar etiqueta" : "Adicionar etiqueta"}</DialogTitle>
            <DialogDescription>
              Etiquetas permitem agrupar as conversas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Etiqueta</Label>
              <Input 
                id="name" 
                placeholder="nome da etiqueta" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input 
                id="description" 
                placeholder="Descrição da etiqueta" 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <div className="flex gap-2 items-center">
                  <Input 
                    id="color" 
                    type="color" 
                    className="w-12 h-12 p-1 cursor-pointer"
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                  />
                  <span className="text-sm text-muted-foreground">{formData.color}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                  ) : (
                      editingTag ? "Salvar" : "Criar"
                  )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
