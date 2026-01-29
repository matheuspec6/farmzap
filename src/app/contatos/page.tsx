 "use client"
 
 import * as React from "react"
 import { useRouter, useSearchParams } from "next/navigation"
import { PlusCircle, Check, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { leadsService } from "@/features/leads/services/lead.service"
 
 export default function ContatosPage() {
   const router = useRouter()
   const params = useSearchParams()
   const selectMode = params?.get("selectLeads") === "1"
  const [groups, setGroups] = React.useState<any[]>([])
 
   React.useEffect(() => {
    const load = async () => {
      // Tenta carregar do Supabase
      try {
        const data = await leadsService.getGroups()
        const normalized = (data || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          createdAt: g.created_at,
          leadCount: g.group_leads && g.group_leads[0] ? g.group_leads[0].count : 0,
          source: "supabase",
        }))
        if (normalized.length) {
          setGroups(normalized)
          return
        }
      } catch {}
      // Fallback: localStorage
     try {
       const raw = localStorage.getItem("leadGroups")
       const arr = raw ? JSON.parse(raw) : []
        if (Array.isArray(arr)) setGroups(arr.map((g: any) => ({ ...g, leadCount: (g.leads || []).length, source: "local" })))
     } catch {}
    }
    load()
  }, [])
 
  const selectGroup = async (g: any) => {
    let leads = g.leads || []
    if (g.source === "supabase") {
      try {
        const { data, error } = await (await import("@/lib/supabase")).supabase
          .from("group_leads")
          .select("name, phone, custom_fields")
          .eq("group_id", g.id)
        if (!error && Array.isArray(data)) {
          leads = data.map((it: any) => ({ name: it.name, phone: it.phone, original: it.custom_fields }))
        }
      } catch {}
    }
    try {
      localStorage.setItem("selectedLeads", JSON.stringify(leads || []))
      localStorage.setItem("selectedCampaignName", g.name || "")
    } catch {}
    router.push("/envios/novo")
  }
  
  const deleteGroup = (id: string) => {
    setGroups((prev) => {
      const next = prev.filter((g) => g.id !== id)
      try {
        localStorage.setItem("leadGroups", JSON.stringify(next))
      } catch {}
      return next
    })
    // Tenta remover do Supabase também
    leadsService.deleteGroup(id).catch(() => {})
  }

  const openEdit = (g: any) => {
    router.push(`/contatos/novo?groupId=${g.id}`)
  }

  const saveEdit = async () => {
    // não utilizado: edição acontece em /contatos/novo com groupId
  }
 
   return (
     <div className="flex-1 space-y-4 p-8 pt-6">
       <div className="flex items-center justify-between space-y-2">
         <h2 className="text-3xl font-bold tracking-tight">Contatos</h2>
         <Button onClick={() => router.push("/contatos/novo")} className="gap-2">
           <PlusCircle className="h-4 w-4" />
           Novo Grupo
         </Button>
       </div>
 
       <div className="text-muted-foreground">
         {groups.length ? (
           <>Total de grupos: <span className="font-medium text-foreground">{groups.length}</span></>
         ) : (
           <>Nenhum grupo ainda. Crie um novo.</>
         )}
       </div>
 
       <Card>
         <CardHeader>
           <CardTitle>Grupos de Leads</CardTitle>
         </CardHeader>
         <CardContent>
           {groups.length === 0 ? (
             <div className="text-sm text-muted-foreground">Nenhum grupo cadastrado.</div>
           ) : (
             <div className="rounded-md border overflow-hidden">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Nome do Grupo</TableHead>
                     <TableHead>Quantidade</TableHead>
                     <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {groups.map((g) => (
                     <TableRow key={g.id}>
                       <TableCell>{g.name}</TableCell>
                      <TableCell>{g.leadCount ?? (g.leads || []).length}</TableCell>
                      <TableCell>{new Date(g.createdAt).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        {selectMode && (
                          <Button size="sm" variant="ghost" className="mr-2 p-2" onClick={() => selectGroup(g)} title="Selecionar">
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="mr-2 p-2" onClick={() => openEdit(g)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" className="p-2" onClick={() => deleteGroup(g.id)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           )}
         </CardContent>
       </Card>
      
     </div>
   )
 }
