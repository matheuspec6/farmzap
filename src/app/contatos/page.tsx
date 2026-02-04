"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, Tag as TagIcon, Search, MessageCircle, Loader2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { campaignService } from "@/features/campaigns/services/campaign.service"
import { ImportLeadsDialog } from "@/features/leads/components/import-leads-dialog"
import { contactService, Contact, Tag } from "@/features/contacts/services/contact.service"
import { toast } from "sonner"

export default function ContatosPage() {
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [tags, setTags] = React.useState<Tag[]>([])
  const [query, setQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null)
  const [formData, setFormData] = React.useState({ name: "", phone: "", tags: [] as string[] })
  const [isSaving, setIsSaving] = React.useState(false)

  // History state
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [contactHistory, setContactHistory] = React.useState<any[]>([])
  const [selectedContactForHistory, setSelectedContactForHistory] = React.useState<Contact | null>(null)
  const [viewingMessage, setViewingMessage] = React.useState<string | null>(null)
  
  // Multi-selection state
  const [selectedContacts, setSelectedContacts] = React.useState<string[]>([])
  const [lastSelectedIndex, setLastSelectedIndex] = React.useState<number | null>(null)
  const shiftPressedRef = React.useRef(false)

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const [rowsPerPage, setRowsPerPage] = React.useState(25)
  const [bulkTagOpen, setBulkTagOpen] = React.useState(false)
  const [bulkTagSaving, setBulkTagSaving] = React.useState(false)
  const [bulkTagId, setBulkTagId] = React.useState<string>("")
  const [filterTagOpen, setFilterTagOpen] = React.useState(false)
  const [filterTagId, setFilterTagId] = React.useState<string>("")

  const loadData = async () => {
    setIsLoading(true)
    try {
        const [tagsData, contactsData] = await Promise.all([
            contactService.getTags(),
            contactService.getContacts()
        ])
        setTags(tagsData)
        setContacts(contactsData)
    } catch (error) {
        console.error(error)
        toast.error("Erro ao carregar dados")
    } finally {
        setIsLoading(false)
    }
  }

  // Load data
  React.useEffect(() => {
    loadData()
  }, [])

  const filteredContacts = contacts.filter(c => {
    const q = query.toLowerCase()
    const matchesQuery = (c.name || "").toLowerCase().includes(q) || c.phone.includes(q)
    const matchesTag = filterTagId ? (c.tags?.includes(filterTagId) ?? false) : true
    return matchesQuery && matchesTag
  })

  // Reset page when query changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [query])
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filterTagId])

  const totalPages = Math.ceil(filteredContacts.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedContacts = filteredContacts.slice(startIndex, endIndex)

  const handleSave = async () => {
    setIsSaving(true)
    try {
        if (editingContact) {
            await contactService.updateContact(editingContact.id, formData)
            toast.success("Contato atualizado")
        } else {
            await contactService.createContact(formData)
            toast.success("Contato criado")
        }
        await loadData()
        setIsDialogOpen(false)
        setEditingContact(null)
        setFormData({ name: "", phone: "", tags: [] })
    } catch (error) {
        console.error(error)
        toast.error("Erro ao salvar contato")
    } finally {
        setIsSaving(false)
    }
  }

  const openNew = () => {
    setEditingContact(null)
    setFormData({ name: "", phone: "", tags: [] })
    setIsDialogOpen(true)
  }

  const openEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({ name: contact.name, phone: contact.phone, tags: contact.tags || [] })
    setIsDialogOpen(true)
  }

  const openHistory = async (contact: Contact) => {
    setSelectedContactForHistory(contact)
    setHistoryOpen(true)
    setHistoryLoading(true)
    setContactHistory([])
    try {
      const data = await campaignService.getHistoryByPhone(contact.phone)
      setContactHistory(data)
    } catch (e) {
      console.error(e)
      setContactHistory([
         { id: '1', campaignName: 'Campanha Promocional', message: 'Olá! Temos uma oferta especial para você hoje.', date: new Date().toISOString(), status: 'enviado' },
         { id: '2', campaignName: 'Aviso de Manutenção', message: 'Sistema em manutenção dia 20/10.', date: new Date(Date.now() - 86400000).toISOString(), status: 'entregue' }
      ])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Excluir contato?")) {
        try {
            await contactService.deleteContact(id)
            toast.success("Contato removido")
            loadData()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao remover contato")
        }
    }
  }

  const toggleTag = (tagId: string) => {
    setFormData(prev => {
      const current = prev.tags || []
      if (current.includes(tagId)) {
        return { ...prev, tags: current.filter(t => t !== tagId) }
      } else {
        return { ...prev, tags: [...current, tagId] }
      }
    })
  }

  const getTagObj = (id: string) => tags.find(t => t.id === id)

  const handleImport = async (importedLeads: any[]) => {
    // importedLeads vem com { name, phone, original, tags: [tagId] }
    setIsLoading(true)
    try {
        const contactsToCreate = importedLeads.map(l => ({
            name: l.name,
            phone: l.phone,
            tags: l.tags || []
        }))
        
        await contactService.bulkCreateContacts(contactsToCreate)
        toast.success(`${contactsToCreate.length} contatos importados`)
        loadData()
    } catch (error) {
        console.error(error)
        toast.error("Erro na importação")
        setIsLoading(false)
    }
  }

  const toggleSelectAll = () => {
    const allVisibleSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedContacts.includes(c.id))
    if (allVisibleSelected) {
        const visibleIds = paginatedContacts.map(c => c.id)
        setSelectedContacts(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
        const visibleIds = paginatedContacts.map(c => c.id)
        setSelectedContacts(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const toggleSelectContact = (id: string, index: number, checked?: boolean, isShift?: boolean) => {
    const targetChecked = typeof checked === "boolean" ? checked : !selectedContacts.includes(id)
    if (isShift && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const idsInRange = paginatedContacts.slice(start, end + 1).map(c => c.id)
      setSelectedContacts(prev => {
        if (targetChecked) {
          return Array.from(new Set([...prev, ...idsInRange]))
        } else {
          return prev.filter(item => !idsInRange.includes(item))
        }
      })
    } else {
      setSelectedContacts(prev => {
        if (targetChecked) {
          return Array.from(new Set([...prev, id]))
        } else {
          return prev.filter(item => item !== id)
        }
      })
    }
    setLastSelectedIndex(index)
    shiftPressedRef.current = false
  }

  const handleBulkDelete = async () => {
    if (confirm(`Tem certeza que deseja excluir ${selectedContacts.length} contatos?`)) {
        setIsLoading(true)
        try {
            await contactService.bulkDeleteContacts(selectedContacts)
            toast.success("Contatos removidos")
            setSelectedContacts([])
            loadData()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao remover contatos")
            setIsLoading(false)
        }
    }
  }
  
  const handleBulkTagSave = async () => {
    setBulkTagSaving(true)
    try {
      const ids = [...selectedContacts]
      if (ids.length === 0) {
        setBulkTagSaving(false)
        setBulkTagOpen(false)
        return
      }
      const applyTags = bulkTagId ? [bulkTagId] : []
      for (const id of ids) {
        await contactService.updateContact(id, { tags: applyTags })
      }
      toast.success("Etiqueta(s) atualizada(s) para os contatos selecionados")
      setBulkTagOpen(false)
      setSelectedContacts([])
      await loadData()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao atualizar etiquetas")
    } finally {
      setBulkTagSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Contatos</h2>
        <div className="flex gap-2">
            {selectedContacts.length > 0 && (
                <Button variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir ({selectedContacts.length})
                </Button>
            )}
            <ImportLeadsDialog onImport={handleImport} tags={tags}>
                <Button variant="outline">
                    Importar Base de Contatos
                </Button>
            </ImportLeadsDialog>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Novo Contato
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar contatos..." 
                    className="max-w-sm"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <Button variant="outline" onClick={() => setFilterTagOpen(true)}>
                  <TagIcon className="mr-2 h-4 w-4" />
                  Filtrar por Tag
                </Button>
                {filterTagId && (
                  <Badge variant="outline" className="ml-1">
                    {getTagObj(filterTagId)?.name || "Etiqueta"}
                  </Badge>
                )}
                {selectedContacts.length > 0 && (
                  <Button variant="outline" onClick={() => setBulkTagOpen(true)}>
                    <TagIcon className="mr-2 h-4 w-4" />
                    Alterar Tag ({selectedContacts.length})
                  </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox 
                        checked={paginatedContacts.length > 0 && paginatedContacts.every(c => selectedContacts.includes(c.id))}
                        onCheckedChange={toggleSelectAll}
                    />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Etiquetas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Carregando contatos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedContacts.map((contact, idx) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                          <Checkbox 
                              checked={selectedContacts.includes(contact.id)}
                              onMouseDown={(e) => { shiftPressedRef.current = (e as any).shiftKey }}
                              onCheckedChange={(checked) => toggleSelectContact(contact.id, idx, !!checked, shiftPressedRef.current)}
                          />
                      </TableCell>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.tags?.map(tagId => {
                            const tag = getTagObj(tagId)
                            if (!tag) return null
                            return (
                              <Badge 
                                key={tagId} 
                                style={{ backgroundColor: tag.color, color: "#fff" }}
                                className="hover:opacity-80"
                              >
                                {tag.name}
                              </Badge>
                            )
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openHistory(contact)} title="Histórico de Envios">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(contact)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredContacts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum contato encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
          
          <div className="flex items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-2">
               <Label htmlFor="rows-per-page" className="whitespace-nowrap text-sm text-muted-foreground">Linhas por página</Label>
               <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                 <SelectTrigger className="w-[70px]" id="rows-per-page">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectGroup>
                     <SelectItem value="10">10</SelectItem>
                     <SelectItem value="25">25</SelectItem>
                     <SelectItem value="50">50</SelectItem>
                     <SelectItem value="100">100</SelectItem>
                   </SelectGroup>
                 </SelectContent>
               </Select>
               <span className="text-sm text-muted-foreground ml-2">
                 {paginatedContacts.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredContacts.length)} de {filteredContacts.length}
               </span>
            </div>

            <Pagination className="w-auto mx-0">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        >
                            Anterior
                        </PaginationPrevious>
                    </PaginationItem>
                    
                    <PaginationItem>
                        <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages || totalPages === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        >
                            Próximo
                        </PaginationNext>
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input 
                id="phone" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="5511999999999"
              />
            </div>
            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma etiqueta disponível. Crie em Etiquetas.</p>
                ) : (
                    tags.map(tag => (
                        <div key={tag.id} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`tag-${tag.id}`} 
                                checked={formData.tags.includes(tag.id)}
                                onCheckedChange={() => toggleTag(tag.id)}
                            />
                            <Label 
                                htmlFor={`tag-${tag.id}`} 
                                className="flex items-center gap-2 cursor-pointer w-full"
                            >
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                {tag.name}
                            </Label>
                        </div>
                    ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico de Envios - {selectedContactForHistory?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             {historyLoading ? (
                 <div className="text-center py-4">Carregando histórico...</div>
             ) : contactHistory.length === 0 ? (
                 <div className="text-center py-4 text-muted-foreground">Nenhum envio encontrado para este contato.</div>
             ) : (
                 <div className="border rounded-md max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campanha</TableHead>
                                <TableHead>Mensagem</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contactHistory.map(h => (
                                <TableRow key={h.id}>
                                    <TableCell className="font-medium">{h.campaignName}</TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={h.message}>{h.message}</TableCell>
                                    <TableCell>{new Date(h.date).toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{h.status}</Badge>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewingMessage(h.message)} title="Ver mensagem completa">
                                                <Eye className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
             )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingMessage} onOpenChange={(open) => !open && setViewingMessage(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mensagem Completa</DialogTitle>
            </DialogHeader>
            <div className="py-4 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                {viewingMessage}
            </div>
            <DialogFooter>
                <Button onClick={() => setViewingMessage(null)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              {selectedContacts.length} contato(s) selecionado(s)
            </div>
            <div className="space-y-2">
              <Label>Etiqueta</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={bulkTagId}
                onChange={(e) => setBulkTagId(e.target.value)}
              >
                <option value="">Sem etiqueta</option>
                {tags.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTagOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkTagSave} disabled={bulkTagSaving || selectedContacts.length === 0}>
              {bulkTagSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Alterar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={filterTagOpen} onOpenChange={setFilterTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtrar por Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Etiqueta</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filterTagId}
                onChange={(e) => setFilterTagId(e.target.value)}
              >
                <option value="">Todas</option>
                {tags.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFilterTagId(""); setFilterTagOpen(false) }}>Limpar</Button>
            <Button onClick={() => setFilterTagOpen(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
