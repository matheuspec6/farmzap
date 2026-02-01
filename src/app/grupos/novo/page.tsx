"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ImportLeadsDialog } from "@/features/leads/components/import-leads-dialog"
import { Upload, Save, Plus, Trash2 } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { leadsService } from "@/features/leads/services/lead.service"

export default function NovoGrupoPage() {
 const router = useRouter()
 const params = useSearchParams()
  const [groupName, setGroupName] = React.useState("")
  const [leads, setLeads] = React.useState<any[]>([])
 const [query, setQuery] = React.useState("")
 const [openAdd, setOpenAdd] = React.useState(false)
 const [newName, setNewName] = React.useState("")
 const [newPhone, setNewPhone] = React.useState("")
 const groupId = params?.get("groupId") || null

 React.useEffect(() => {
   const loadExisting = async () => {
     if (!groupId) return
     try {
       const g = await leadsService.getGroup(groupId)
       if (g && g.name) setGroupName(g.name)
       try {
         const arr = await leadsService.getGroupLeads(groupId)
         if (Array.isArray(arr) && arr.length) setLeads(arr.map((it: any) => ({ name: it.name, phone: it.phone })))
       } catch {}
     } catch {
       try {
         const raw = localStorage.getItem("leadGroups")
         const arr = raw ? JSON.parse(raw) : []
         const found = Array.isArray(arr) ? arr.find((x: any) => String(x.id) === String(groupId)) : null
         if (found) {
           setGroupName(found.name || "")
           setLeads(Array.isArray(found.leads) ? found.leads : [])
         }
       } catch {}
     }
   }
   loadExisting()
 }, [groupId])

  const handleImport = (arr: any[]) => setLeads(arr)

 const filteredLeads = React.useMemo(() => {
   const q = query.trim().toLowerCase()
   return leads
     .map((l, _i) => ({ ...l, _i }))
     .filter((l) => {
       if (!q) return true
       const n = String(l.name || "").toLowerCase()
       const p = String(l.phone || "")
       return n.includes(q) || p.includes(q)
     })
 }, [leads, query])

 const handleDelete = (idx: number) => {
   setLeads((prev) => prev.filter((_, i) => i !== idx))
 }

 const handleAddLead = () => {
   const name = newName.trim()
   const phone = newPhone.trim()
   if (!name || !phone) return
   setLeads((prev) => [...prev, { name, phone }])
   setNewName("")
   setNewPhone("")
   setOpenAdd(false)
 }

 const saveGroup = async () => {
   if (!groupName) return
   try {
     const prepared = leads.map((l) => ({ name: l.name, phone: l.phone, original: l }))
     if (groupId) {
       try {
         await leadsService.updateGroupName(groupId, groupName)
       } catch {}
       try {
         await leadsService.replaceGroupLeads(groupId, prepared)
       } catch {
         try {
           const raw = localStorage.getItem("leadGroups")
           const arr = raw ? JSON.parse(raw) : []
           const next = Array.isArray(arr)
             ? arr.map((g: any) => (String(g.id) === String(groupId) ? { ...g, name: groupName, leads } : g))
             : []
           localStorage.setItem("leadGroups", JSON.stringify(next))
         } catch {}
       }
     } else {
       const created = await leadsService.createGroup(groupName, prepared)
       try {
         const raw = localStorage.getItem("leadGroups")
         const arr = raw ? JSON.parse(raw) : []
         const id = created?.id || String(Date.now())
         const createdAt = Date.now()
         const next = Array.isArray(arr) ? [...arr, { id, name: groupName, leads, createdAt }] : [{ id, name: groupName, leads, createdAt }]
         localStorage.setItem("leadGroups", JSON.stringify(next))
       } catch {}
     }
   } catch (e) {
     alert("Falha ao salvar no Supabase. Verifique as credenciais e a tabela.")
   }
   router.push("/grupos")
 }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
     <h2 className="text-3xl font-bold tracking-tight">{groupId ? "Editar Grupo" : "Novo Grupo"}</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-4 md:col-span-2 space-y-6">
          <div className="rounded-md border p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Nome do Grupo</Label>
              <Input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex: Campanha de Ofertas - Janeiro" />
            </div>
            <ImportLeadsDialog onImport={handleImport}>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Importar Base de Contatos
              </Button>
            </ImportLeadsDialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
            </CardHeader>
            <CardContent>
             <div className="flex items-center justify-between gap-2 pb-4">
               <Input
                 placeholder="Pesquisar por nome ou telefone"
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 className="w-full md:w-1/2"
               />
               <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                 <DialogTrigger asChild>
                   <Button className="gap-2">
                     <Plus className="h-4 w-4" />
                     Adicionar lead
                   </Button>
                 </DialogTrigger>
                 <DialogContent>
                   <DialogHeader>
                     <DialogTitle>Novo Lead</DialogTitle>
                   </DialogHeader>
                   <div className="space-y-3">
                     <div className="space-y-2">
                       <Label htmlFor="new-name">Nome</Label>
                       <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Maria Silva" />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="new-phone">Telefone</Label>
                       <Input id="new-phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Ex: 55999999999" />
                     </div>
                     <div className="flex justify-end gap-2 pt-2">
                       <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancelar</Button>
                       <Button onClick={handleAddLead} className="gap-2">
                         <Save className="h-4 w-4" />
                         Salvar
                       </Button>
                     </div>
                   </div>
                 </DialogContent>
               </Dialog>
             </div>
             {leads.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum contato importado.</div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                       <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                     {filteredLeads.slice(0, 20).map((l) => (
                       <TableRow key={l._i}>
                          <TableCell>{l.name}</TableCell>
                          <TableCell>{l.phone}</TableCell>
                         <TableCell className="text-right">
                           <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDelete(l._i)}>
                             <Trash2 className="h-4 w-4" />
                             Excluir
                           </Button>
                         </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                 <div className="text-xs text-muted-foreground p-2">Mostrando {Math.min(20, filteredLeads.length)} de {filteredLeads.length}</div>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button className="gap-2" onClick={saveGroup} disabled={!groupName || leads.length === 0}>
                  <Save className="h-4 w-4" />
                  Salvar Grupo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
