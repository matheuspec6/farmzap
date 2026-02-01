"use client"

import * as React from "react"
import { 
  Plus, 
  Trash2, 
  Search,
  MoreHorizontal,
  RefreshCw,
  Download,
  Eye,
  Filter,
  FileSpreadsheet
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"

import { cn } from "@/lib/utils"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { campaignService } from "@/features/campaigns/services/campaign.service"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"

export default function EnviosPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedCampaigns, setSelectedCampaigns] = React.useState<string[]>([])
  const [debugOpen, setDebugOpen] = React.useState(false)
  const [debugCampaign, setDebugCampaign] = React.useState<any | null>(null)
  const [queueCounts, setQueueCounts] = React.useState<any | null>(null)
  const [queueJobs, setQueueJobs] = React.useState<any[]>([])
  const [redisStatus, setRedisStatus] = React.useState<{ ok: boolean, message: string } | null>(null)
  const [instances, setInstances] = React.useState<any[]>([])
  const [progress, setProgress] = React.useState<{ erro: number, enviando: number, enviado: number } | null>(null)
  const tz = "America/Sao_Paulo"
  const [deactivateId, setDeactivateId] = React.useState<string | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [selectedJob, setSelectedJob] = React.useState<any | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [textFilter, setTextFilter] = React.useState("")

  const loadDebug = async (c: any) => {
    setDebugCampaign(c)
    setDebugOpen(true)
    try {
      const statsRes = await fetch(`/api/queue/stats?campaignId=${c.id}`)
      const stats = await statsRes.json()
      setQueueCounts(stats)
    } catch (e) {
      setQueueCounts(null)
    }
    try {
      const jobsRes = await fetch(`/api/queue/jobs?campaignId=${c.id}&limit=200`)
      const jobs = await jobsRes.json()
      setQueueJobs(jobs.jobs || [])
      const js = jobs.jobs || []
      const erro = js.filter((j: any) => j.status === "failed").length
      const enviando = js.filter((j: any) => j.status === "waiting" || j.status === "active" || j.status === "delayed").length
      const enviado = js.filter((j: any) => j.status === "completed").length
      setProgress({ erro, enviando, enviado })
    } catch {
      setQueueJobs([])
      setProgress({ erro: 0, enviando: 0, enviado: 0 })
    }
    try {
      const pingRes = await fetch("/api/queue/ping")
      const ping = await pingRes.json()
      setRedisStatus({ ok: !!ping.ok, message: ping.ok ? "Redis OK" : (ping.error || "Falha") })
    } catch (e: any) {
      setRedisStatus({ ok: false, message: e?.message || "Falha" })
    }
    try {
      const instRes = await fetch("/api/instances", { cache: "no-store" })
      const instJson = await instRes.json()
      setInstances(Array.isArray(instJson.instances) ? instJson.instances : [])
    } catch {
      setInstances([])
    }
  }

  const fetchCampaigns = async () => {
    setIsLoading(true)
    try {
      const data = await campaignService.getCampaigns()
      const { data: stats } = await supabase
        .from("campaign_stats")
        .select("*")
      const map = new Map<string, any>()
      if (Array.isArray(stats)) {
        for (const s of stats) map.set(s.campaign_id, s)
      }
      const enrichedData = data
        .map((c: any) => {
          const s = map.get(c.id)
          // Normaliza status 'deleted' para 'excluido' para consistência no filtro
          const statusNormalizado = c.status === "deleted" ? "excluido" : c.status
          return {
            ...c,
            status: statusNormalizado,
            veiculacao: statusNormalizado,
            enviados: s ? Number(s.sent_count || 0) : 0,
            erros: s ? Number(s.failed_count || 0) : 0,
            leadCount: s ? Number(s.total_leads || 0) : (c.leads && c.leads[0] ? c.leads[0].count : 0),
          }
        })
      setCampaigns(enrichedData)
    } catch (error) {
      console.error("Erro ao buscar campanhas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatEpoch = (ms?: number) => {
    if (!ms) return "-"
    try {
      return new Date(ms).toLocaleString("pt-BR", { timeZone: tz })
    } catch {
      return new Date(ms).toLocaleString("pt-BR")
    }
  }

  const viewProgress = () => {
    const js = queueJobs || []
    const erro = js.filter((j: any) => j.status === "failed").length
    const enviando = js.filter((j: any) => j.status === "waiting" || j.status === "active" || j.status === "delayed").length
    const enviado = js.filter((j: any) => j.status === "completed").length
    setProgress({ erro, enviando, enviado })
  }

  React.useEffect(() => {
    fetchCampaigns()
  }, [])

  const handleDeleteCampaign = async (id: string) => {
      try {
        await fetch("/api/queue/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: id })
        })
      } catch {}
    try {
      await campaignService.deleteCampaign(id)
      fetchCampaigns() // Recarregar lista
    } catch (error) {
      console.error("Erro ao excluir campanha:", error)
    } finally {
      setDeleteId(null)
    }
  }

  const handleDeactivateCampaign = async (id: string) => {
    try {
      await fetch("/api/queue/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id, limit: 1000 }),
      })
    } catch {}
    try {
      await campaignService.deactivateCampaign(id)
      fetchCampaigns()
      alert("Agendamento desativado. Para reativar, crie um novo envio.")
    } catch (error) {
      console.error("Erro ao desativar campanha:", error)
    } finally {
      setDeactivateId(null)
    }
  }

  const handleDownloadReportXlsx = async (c: any) => {
    try {
      const leads = await campaignService.getCampaignLeads(c.id)
      if (!leads || leads.length === 0) {
        alert("Nenhum dado encontrado para o relatório")
        return
      }

      const rows = leads.map((l: any) => ({
        Nome: l.name,
        Telefone: l.phone,
        Status: l.status,
        "Data Envio": l.sent_at ? new Date(l.sent_at).toLocaleString("pt-BR") : "-",
        ...(typeof l.custom_fields === 'object' ? l.custom_fields : {})
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, "Relatório")
      
      const safeName = String(c.name || "campanha").replace(/[^\w\-]+/g, "-")
      XLSX.writeFile(wb, `relatorio-${safeName}.xlsx`)
    } catch (error) {
      console.error(error)
      alert("Falha ao gerar relatório XLSX")
    }
  }

  const handleDownloadReport = async (c: any) => {
    try {
      const res = await fetch(`/api/reports/pdf?campaignId=${c.id}`, { cache: "no-store" })
      if (!res.ok) {
        alert("Falha ao gerar relatório")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const safeName = String(c.name || "campanha").replace(/[^\w\-]+/g, "-")
      a.download = `relatorio-${safeName}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert("Falha ao gerar relatório")
    }
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedCampaigns]
    for (const id of ids) {
      try {
        await fetch("/api/queue/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: id })
        })
      } catch {}
      try {
        await campaignService.deleteCampaign(id)
      } catch {}
    }
    setSelectedCampaigns([])
    setBulkDeleteOpen(false)
    fetchCampaigns()
  }

  const filteredCampaigns = campaigns.filter(c => {
    const matchesText = textFilter 
      ? c.name.toLowerCase().includes(textFilter.toLowerCase()) 
      : true
    
    const isDeleted = c.status === "deleted" || c.status === "excluido"
    if (statusFilter.length === 0) {
       return !isDeleted && matchesText
    }
    
    const matchesStatus = statusFilter.includes(c.veiculacao || c.status)
    return matchesText && matchesStatus
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciador de Envio</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => router.push("/envios/novo")}>
            <Plus className="mr-2 h-4 w-4" /> Novo Envio
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Filtrar campanhas..."
            className="h-8 w-[150px] lg:w-[250px]"
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-dashed">
                <Filter className="mr-2 h-4 w-4" />
                Status
                {statusFilter.length > 0 && (
                  <>
                    <DropdownMenuSeparator className="mx-2 h-4" />
                    <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                      {statusFilter.length}
                    </Badge>
                    <div className="hidden space-x-1 lg:flex">
                      {statusFilter.length > 2 ? (
                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                          {statusFilter.length} selecionados
                        </Badge>
                      ) : (
                        statusFilter.map((option) => (
                          <Badge variant="secondary" key={option} className="rounded-sm px-1 font-normal">
                            {option}
                          </Badge>
                        ))
                      )}
                    </div>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuLabel>Filtrar por status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["rascunho", "agendado", "processando", "concluido", "falhou", "cancelado", "excluido"].map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setStatusFilter([...statusFilter, status])
                    } else {
                      setStatusFilter(statusFilter.filter((s) => s !== status))
                    }
                  }}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setStatusFilter([])}
                    className="justify-center text-center"
                  >
                    Limpar filtros
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          {selectedCampaigns.length > 0 && (
            <Button variant="destructive" size="sm" className="h-8" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir selecionados ({selectedCampaigns.length})
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8" onClick={fetchCampaigns}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={selectedCampaigns.length > 0 && selectedCampaigns.length === filteredCampaigns.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCampaigns(filteredCampaigns.map((c) => c.id))
                    } else {
                      setSelectedCampaigns([])
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Número de Leads</TableHead>
              <TableHead>Enviados</TableHead>
              <TableHead>Erros no número</TableHead>
              <TableHead className="w-[100px]">Configurações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                        Carregando campanhas...
                    </TableCell>
                </TableRow>
            ) : filteredCampaigns.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                        Nenhuma campanha encontrada.
                    </TableCell>
                </TableRow>
            ) : (
                filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                    <TableCell>
                    <Checkbox 
                        checked={selectedCampaigns.includes(campaign.id)}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                setSelectedCampaigns([...selectedCampaigns, campaign.id])
                            } else {
                                setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id))
                            }
                        }}
                    />
                    </TableCell>
                    <TableCell>
                        <Badge variant={campaign.veiculacao === "agendado" || campaign.veiculacao === "processando" ? "default" : "secondary"}>
                            {campaign.veiculacao}
                        </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                        {campaign.name}
                    </TableCell>
                    <TableCell>
                        {(() => {
                          const iso = (campaign?.settings && campaign.settings.schedule_start) || campaign.start_date
                          return iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: tz }) : "-"
                        })()}
                    </TableCell>
                    <TableCell>
                        {(() => {
                          const iso = (campaign?.settings && campaign.settings.schedule_end) || campaign.end_date
                          return iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: tz }) : "-"
                        })()}
                    </TableCell>
                    <TableCell>
                        {campaign.leadCount}
                    </TableCell>
                    <TableCell>
                        {campaign.enviados}
                    </TableCell>
                    <TableCell>
                        {campaign.erros}
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => loadDebug(campaign)}>
                                    Debug: Processo/Config/Log
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadReport(campaign)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Baixar relatório PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadReportXlsx(campaign)}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Baixar relatório Excel
                                </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeactivateId(campaign.id)}
                              >
                                Desativar agendamento
                              </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setDeleteId(campaign.id)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir campanha
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanhas selecionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Você excluirá {selectedCampaigns.length} campanha(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao deletar essa campanha você perde para sempre os dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDeleteCampaign(deleteId)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Você desativará o agendamento e não conseguirá ativar novamente, apenas criando outro envio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deactivateId && handleDeactivateCampaign(deactivateId)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Debug da Campanha {debugCampaign?.name || ""}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="processo" className="space-y-4">
            <TabsList>
              <TabsTrigger value="processo">Processo</TabsTrigger>
              <TabsTrigger value="config">Configurações</TabsTrigger>
              <TabsTrigger value="log">Log</TabsTrigger>
            </TabsList>
            <TabsContent value="processo">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border p-4">
                  <h3 className="font-medium mb-2">Contagens da Fila</h3>
                  <div className="text-sm space-y-1">
                    <div>Waiting: {queueCounts?.counts?.waiting ?? "-"}</div>
                    <div>Delayed: {queueCounts?.counts?.delayed ?? "-"}</div>
                    <div>Active: {queueCounts?.counts?.active ?? "-"}</div>
                    <div>Completed: {queueCounts?.counts?.completed ?? "-"}</div>
                    <div>Failed: {queueCounts?.counts?.failed ?? "-"}</div>
                  </div>
                  {queueCounts?.byCampaign && (
                    <div className="mt-4 text-sm">
                      <h4 className="font-medium mb-1">Por campanha</h4>
                      <div>Waiting: {queueCounts.byCampaign.totals.waiting}</div>
                      <div>Delayed: {queueCounts.byCampaign.totals.delayed}</div>
                      <div>Active: {queueCounts.byCampaign.totals.active}</div>
                      <div>Completed: {queueCounts.byCampaign.totals.completed}</div>
                      <div>Failed: {queueCounts.byCampaign.totals.failed}</div>
                    </div>
                  )}
                </div>
                <div className="rounded-md border p-4">
                  <h3 className="font-medium mb-2">Ações</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => debugCampaign && loadDebug(debugCampaign)}>Atualizar</Button>
                    <Button variant="outline" onClick={viewProgress}>Ver Progresso</Button>
                  </div>
                  <div className="mt-4 text-sm">
                    <div className="font-medium mb-1">Resumo:</div>
                    <div>Erro: {progress?.erro ?? "-"}</div>
                    <div>Enviando: {progress?.enviando ?? "-"}</div>
                    <div>Enviado: {progress?.enviado ?? "-"}</div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="config">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border p-4">
                  <h3 className="font-medium mb-2">Redis</h3>
                  <div className="text-sm">{redisStatus ? (redisStatus.ok ? "Conectado" : `Erro: ${redisStatus.message}`) : "Carregando..."}</div>
                </div>
                <div className="rounded-md border p-4">
                  <h3 className="font-medium mb-2">Canais (Evolution)</h3>
                  <div className="text-sm">{instances.length ? `${instances.length} conectada(s)` : "Nenhuma conectada"}</div>
                </div>
                <div className="rounded-md border p-4 col-span-2">
                  <h3 className="font-medium mb-2">Configurações da Campanha</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Dividir contatos em lotes de: {debugCampaign?.settings?.split_count ?? "-"}</div>
                    <div>Tempo entre mensagens (seg): {debugCampaign?.settings?.message_interval ?? "-"}</div>
                    <div>IA Mesclar: {debugCampaign?.settings?.ai_merge ? "Sim" : "Não"}</div>
                    <div>Canais: {(debugCampaign?.settings?.instances || []).join(", ") || "-"}</div>
                    <div>Fuso horário: America/Sao_Paulo (UTC-03:00)</div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="log">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Msg</TableHead>
                      <TableHead>Retorno/Erro</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Sem eventos</TableCell>
                      </TableRow>
                    ) : (
                      queueJobs.map((j: any) => (
                        <TableRow key={j.id}>
                          <TableCell>
                            <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>
                              {j.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{j.data?.number ?? "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={j.data?.text}>{j.data?.text ?? "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                             {j.failedReason ? (
                               <span className="text-destructive">{j.failedReason}</span>
                             ) : (
                               typeof j.returnValue === "object" ? JSON.stringify(j.returnValue) : String(j.returnValue ?? "")
                             )}
                          </TableCell>
                          <TableCell>{formatEpoch(j.timestamp)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedJob(j)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedJob} onOpenChange={(o) => !o && setSelectedJob(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Job #{selectedJob?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Status:</span>
                <div className="mt-1">
                   <Badge variant={selectedJob?.status === "completed" ? "default" : selectedJob?.status === "failed" ? "destructive" : "secondary"}>
                      {selectedJob?.status}
                   </Badge>
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Data:</span>
                <div className="mt-1">{formatEpoch(selectedJob?.timestamp)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Payload de Envio</h4>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedJob?.data, null, 2)}
              </pre>
            </div>

            {selectedJob?.failedReason && (
              <div>
                <h4 className="text-sm font-medium text-destructive mb-2">Erro (Falha)</h4>
                <pre className="bg-destructive/10 text-destructive p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                  {selectedJob.failedReason}
                </pre>
              </div>
            )}

            {selectedJob?.returnValue && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Retorno do Worker</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                  {typeof selectedJob.returnValue === "object" 
                    ? JSON.stringify(selectedJob.returnValue, null, 2) 
                    : selectedJob.returnValue}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
