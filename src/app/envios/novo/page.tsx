"use client"

import * as React from "react"
import { ChevronDownIcon, Maximize2, Upload, FileSpreadsheet, Users, LayoutTemplate } from "lucide-react"
import { useRouter } from "next/navigation"
import { ptBR } from "date-fns/locale"
import { addSeconds, isAfter } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription, AlertAction } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { campaignService } from "@/features/campaigns/services/campaign.service"
import { contactService } from "@/features/contacts/services/contact.service"
import { templateService } from "@/features/templates/services/template.service"
import { cn } from "@/lib/utils"

export default function ConfigurarEnvioPage() {
  const router = useRouter()
  const [leads, setLeads] = React.useState<any[]>([])
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)
  const [endEnabled, setEndEnabled] = React.useState<boolean>(false)
  const [campaignName, setCampaignName] = React.useState("")
  const [openStart, setOpenStart] = React.useState(false)
  const [openEnd, setOpenEnd] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  
  // Tag selection state
  const [tags, setTags] = React.useState<{id: string, name: string, color: string}[]>([])
  const [selectedTagId, setSelectedTagId] = React.useState<string>("")
  const [allContacts, setAllContacts] = React.useState<any[]>([])
  const [templates, setTemplates] = React.useState<any[]>([])

  const BRAZIL_TZ = "America/Sao_Paulo"
  const formatBrazilDateTime = (d: Date | null) => {
    if (!d) return "-"
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: BRAZIL_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d)
  }

  // Helper para hora atual formatada no Brasil
  const getCurrentTime = () => {
    const now = new Date()
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: BRAZIL_TZ })
  }
  
  const getCurrentTimePlus2 = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 2)
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: BRAZIL_TZ })
  }
  
  // Novos estados
  const [splitCount, setSplitCount] = React.useState("")
  const [messageInterval, setMessageInterval] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [connectedInstances, setConnectedInstances] = React.useState<{ id: string; name: string; key?: string; profileName?: string }[]>([])
  const [selectedInstanceNames, setSelectedInstanceNames] = React.useState<string[]>([])
  const [aiMerge, setAiMerge] = React.useState<boolean>(false)
  const [startTime, setStartTime] = React.useState(getCurrentTimePlus2())
  const [endTime, setEndTime] = React.useState(getCurrentTime())
  const [justReduced, setJustReduced] = React.useState(false)

  React.useEffect(() => {
    // Definir data inicial como hoje
    setStartDate(new Date())
  }, [])

  React.useEffect(() => {
    const loadInstances = async () => {
      try {
        const res = await fetch("/api/instances", { cache: "no-store" })
        const json = await res.json()
        const list = Array.isArray(json.instances) ? json.instances : []
        setConnectedInstances(list)
        setSelectedInstanceNames(list.map((i: any) => i.name).filter(Boolean))
      } catch {}
    }
    loadInstances()
  }, [])
  
  React.useEffect(() => {
    // Load Tags and Contacts
    const loadData = async () => {
        try {
            const [fetchedTags, fetchedContacts, fetchedTemplates] = await Promise.all([
                contactService.getTags(),
                contactService.getContacts(),
                templateService.getTemplates()
            ])
            
            setTags(fetchedTags)
            setAllContacts(fetchedContacts)
            
            const activeTemplates = fetchedTemplates.filter((t: any) => t.status === 'active')
            setTemplates(activeTemplates)
        } catch (error) {
            console.error("Erro ao carregar dados:", error)
        }
    }
    loadData()

    try {
      const raw = localStorage.getItem("selectedLeads")
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length) {
          setLeads(arr)
        }
        const nm = localStorage.getItem("selectedCampaignName")
        if (nm) setCampaignName(nm)
        localStorage.removeItem("selectedLeads")
        localStorage.removeItem("selectedCampaignName")
      }
    } catch {}
  }, [])

  React.useEffect(() => {
    if (selectedTagId) {
        const filtered = allContacts.filter(c => c.tags && c.tags.includes(selectedTagId))
        // Normalizar para o formato esperado (name, phone, original)
        setLeads(filtered.map(c => ({ name: c.name, phone: c.phone, original: c })))
    } else if (leads.length === 0 && allContacts.length > 0) {
        // Se não tem tag selecionada e leads está vazio, não faz nada (espera seleção)
    }
  }, [selectedTagId, allContacts])

  const handleImport = (importedLeads: any[]) => {
    setLeads(importedLeads)
  }

  const handleSave = async () => {
    if (!campaignName || !startDate || leads.length === 0 || (endEnabled && !endDate)) {
      alert("Preencha todos os campos obrigatórios e selecione uma etiqueta com contatos.")
      return
    }

    setIsLoading(true)
    try {
        const toDateWithTime = (date: Date, time: string) => {
          const parts = String(time || "").split(":")
          const hh = Number(parts[0] || 0)
          const mm = Number(parts[1] || 0)
          const ss = Number(parts[2] || 0)
          const d = new Date(date)
          d.setHours(hh, mm, ss, 0)
          return d
        }
        const baseStart = toDateWithTime(startDate!, startTime)
        const endLimit = endEnabled && endDate ? toDateWithTime(endDate!, endTime) : null
        const now = new Date()
        if (baseStart.getTime() < now.getTime()) {
          alert(`Início do agendamento não pode ser anterior ao horário atual (Brasil): ${formatBrazilDateTime(now)}`)
          setIsLoading(false)
          return
        }
        if (endLimit && endLimit.getTime() < now.getTime()) {
          alert(`Fim do agendamento não pode ser anterior ao horário atual (Brasil): ${formatBrazilDateTime(now)}`)
          setIsLoading(false)
          return
        }
        const created = await campaignService.createCampaignWithLeads({
            name: campaignName,
            start_date: baseStart,
            end_date: endLimit ?? null,
            message_template: message,
            settings: {
                split_count: splitCount,
                message_interval: messageInterval,
                instances: selectedInstanceNames,
                ai_merge: aiMerge,
                schedule_start: baseStart.toISOString(),
                schedule_end: endLimit ? endLimit.toISOString() : null,
                timezone: BRAZIL_TZ,
            }
        }, leads)

        const totalLeads = leads.length
        const leadsPerBlock = Math.max(1, Number(splitCount) || 1)
        const interval = Math.max(1, Number(messageInterval) || 1)
        const blockCount = Math.ceil(totalLeads / leadsPerBlock)
        const blocks: any[] = []
        for (let i = 0; i < blockCount; i++) {
          const start = i * leadsPerBlock
          const end = start + leadsPerBlock
          blocks.push(leads.slice(start, end))
        }
        let variations: string[] = Array(blockCount).fill(message)
        if (aiMerge) {
          try {
            const res = await fetch("/api/ai/variations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ base: message, count: blockCount }),
            })
            const json = await res.json()
            if (Array.isArray(json.messages) && json.messages.length) {
              variations = json.messages.slice(0, blockCount)
            }
          } catch {}
        }
        const plan = {
          baseUrl: "EVOLUTION_API_URL",
          campaignId: created?.id,
          startAt: baseStart,
          endAt: endLimit || undefined,
          intervalSec: interval,
          blocks: blocks.map((group, i) => {
            const when = addSeconds(baseStart, i * interval)
            if (endLimit && isAfter(when, endLimit)) return null
            const instance = selectedInstanceNames.length ? selectedInstanceNames[i % selectedInstanceNames.length] : null
            return {
              index: i + 1,
              scheduledAt: when.getTime(),
              leads: group.map((g: any) => {
                const digits = String(g.phone || "").replace(/\D/g, "")
                return { name: g.name, phone: digits, original: g.original }
              }),
              message: variations[i],
              instance,
              endpoint: instance ? `/message/sendText/${instance}` : null,
            }
          }).filter(Boolean),
        }
        console.log("Plano de Envio", plan)
        try {
          const r = await fetch("/api/schedule/enqueue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plan),
          })
          const j = await r.json()
          console.log("Jobs enfileirados", j)
        } catch {}

        alert("Agendamento realizado com sucesso!")
        router.push('/envios')

    } catch (error: any) {
        console.error("Erro ao salvar:", error)
        alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`)
    } finally {
        setIsLoading(false)
    }
  }



  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Configurações de Envio</h2>
      
      <div className="text-muted-foreground">
        Total de leads importados: <span className="font-medium text-foreground">{leads.length}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-4 md:col-span-2 space-y-6">

          {/* Destinatários */}
          <div className="rounded-md border p-4">
            <h3 className="mb-4 text-lg font-medium">Destinatários</h3>
            <div className="flex flex-col gap-3">
                <Label>Selecionar Etiqueta</Label>
                <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione uma etiqueta..." />
                    </SelectTrigger>
                    <SelectContent>
                        {tags.map(tag => (
                            <SelectItem key={tag.id} value={tag.id}>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: tag.color}} />
                                    {tag.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                    {leads.length} contatos encontrados com esta etiqueta.
                </div>
            </div>
          </div>

          {/* Nome da Campanha */}
          <div className="rounded-md border p-4">
            <h3 className="mb-4 text-lg font-medium">Nome da Campanha</h3>
            <div className="flex flex-col gap-3">
                <Label htmlFor="campaign-name">Nome de identificação</Label>
                <Input 
                    id="campaign-name" 
                    placeholder="Ex: Campanha de Ofertas - Janeiro" 
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                />
            </div>
          </div>
          
          {/* Início do Agendamento */}
          <div className="rounded-md border p-4">
             <h3 className="mb-4 text-lg font-medium">Início do Agendamento</h3>
             <div className="flex gap-4"> 
              <div className="flex flex-col gap-3"> 
                <Label htmlFor="start-date-picker" className="px-1"> 
                  Data 
                </Label> 
                <Popover open={openStart} onOpenChange={setOpenStart}> 
                  <PopoverTrigger asChild> 
                    <Button 
                      variant="outline" 
                      id="start-date-picker" 
                      className="w-[240px] justify-between font-normal" 
                    > 
                      {startDate ? startDate.toLocaleDateString("pt-BR") : "Selecione a data"} 
                      <ChevronDownIcon className="h-4 w-4 opacity-50" /> 
                    </Button> 
                  </PopoverTrigger> 
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start"> 
                    <Calendar 
                      mode="single" 
                      selected={startDate} 
                      onSelect={(date) => { 
                        setStartDate(date) 
                        setOpenStart(false) 
                      }}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date < today
                      }}
                      locale={ptBR}
                    /> 
                  </PopoverContent> 
                </Popover> 
              </div> 
              <div className="flex flex-col gap-3"> 
                <Label htmlFor="start-time-picker" className="px-1"> 
                  Hora 
                </Label> 
                <Input 
                  type="text" 
                  id="start-time-picker" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="HH:MM:SS"
                  className="bg-background appearance-none w-[150px]" 
                /> 
              </div> 
            </div> 

            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="end-enabled"
                  checked={endEnabled}
                  onCheckedChange={(checked) => {
                    const val = !!checked
                    setEndEnabled(val)
                    if (!val) {
                      setOpenEnd(false)
                    } else {
                      setEndDate(new Date())
                      setEndTime(getCurrentTime())
                    }
                  }}
                />
                <Label htmlFor="end-enabled" className="text-sm font-normal text-muted-foreground">Ativar fim do agendamento</Label>
              </div>
              
              {endEnabled && (
                  <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300 mt-2"> 
                    <div className="flex flex-col gap-3"> 
                      <Label htmlFor="end-date-picker" className="px-1"> 
                        Data Final
                      </Label> 
                      <Popover open={openEnd} onOpenChange={setOpenEnd}> 
                        <PopoverTrigger asChild> 
                          <Button 
                            variant="outline" 
                            id="end-date-picker" 
                            className="w-[240px] justify-between font-normal" 
                          > 
                            {endDate ? endDate.toLocaleDateString("pt-BR") : "Selecione a data"} 
                            <ChevronDownIcon className="h-4 w-4 opacity-50" /> 
                          </Button> 
                        </PopoverTrigger> 
                        <PopoverContent className="w-auto overflow-hidden p-0" align="start"> 
                          <Calendar 
                            mode="single" 
                            selected={endDate} 
                            onSelect={(date) => { 
                              setEndDate(date) 
                              setOpenEnd(false) 
                            }}
                            disabled={(date) => {
                              const today = new Date()
                              today.setHours(0, 0, 0, 0)
                              return date < today
                            }}
                            locale={ptBR}
                          /> 
                        </PopoverContent> 
                      </Popover> 
                    </div> 
                    <div className="flex flex-col gap-3"> 
                      <Label htmlFor="end-time-picker" className="px-1"> 
                        Hora Final
                      </Label> 
                      <Input 
                        type="text" 
                        id="end-time-picker" 
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        placeholder="HH:MM:SS"
                        className="bg-background appearance-none w-[150px]" 
                      /> 
                    </div> 
                  </div> 
              )}
            </div>
          </div>

          {(() => {
            const toDateWithTimeLocal = (date: Date, time: string) => {
              const parts = String(time || "").split(":")
              const hh = Number(parts[0] || 0)
              const mm = Number(parts[1] || 0)
              const ss = Number(parts[2] || 0)
              const d = new Date(date)
              d.setHours(hh, mm, ss, 0)
              return d
            }
            const leadsCount = leads.length
            const leadsPerBlockN = Math.max(1, Number(splitCount) || 1)
            const intervalN = Math.max(1, Number(messageInterval) || 1)
            const startAt = startDate ? toDateWithTimeLocal(startDate, startTime) : null
            const endAt = endEnabled && endDate ? toDateWithTimeLocal(endDate, endTime) : null
            const now = new Date()
            const startInvalid = !!startAt && startAt.getTime() < now.getTime()
            const endInvalid = !!endAt && endAt.getTime() < now.getTime()
            const windowSec = startAt && endAt ? Math.max(0, Math.floor((endAt.getTime() - startAt.getTime()) / 1000)) : null
            const allowedBlocks = windowSec != null ? (intervalN > 0 ? Math.floor(windowSec / intervalN) + 1 : 0) : null
            const allowedLeads = allowedBlocks != null ? allowedBlocks * leadsPerBlockN : null
            const needsReduction = endEnabled && !!startAt && !!endAt && allowedLeads != null && allowedLeads < leadsCount
            return (
              <>
                {startInvalid && (
                  <Alert variant="destructive" className="relative">
                    <AlertTitle>Início inválido</AlertTitle>
                    <AlertDescription>
                      Início do agendamento não pode ser anterior ao horário atual (Brasil): {formatBrazilDateTime(now)}
                    </AlertDescription>
                  </Alert>
                )}
                {endInvalid && (
                  <Alert variant="destructive" className="relative">
                    <AlertTitle>Fim inválido</AlertTitle>
                    <AlertDescription>
                      Fim do agendamento não pode ser anterior ao horário atual (Brasil): {formatBrazilDateTime(now)}
                    </AlertDescription>
                  </Alert>
                )}
                {needsReduction && (
                  <Alert variant="destructive" className="relative">
                    <AlertTitle>Leads maior que tempo</AlertTitle>
                    <AlertDescription>
                      A janela de agendamento não comporta todos os leads. Reduzir para {allowedLeads} leads?
                    </AlertDescription>
                    <AlertAction className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => { setLeads((prev) => prev.slice(0, allowedLeads || 0)); setJustReduced(true) }}>
                        Sim
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setJustReduced(false)}>
                        Não
                      </Button>
                    </AlertAction>
                  </Alert>
                )}
              </>
            )
          })()}

          {/* Configurações de Envio */}
          <div className="rounded-md border p-4 space-y-6">
            <h3 className="text-lg font-medium">Parâmetros de Envio</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="split-count">Divisão dos grupo de de contatos</Label>
                <Input 
                  id="split-count" 
                  type="number" 
                  placeholder="Ex: 50" 
                  value={splitCount}
                  onChange={(e) => setSplitCount(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="message-interval">Tempo entre mensagens (seg)</Label>
                <Input 
                  id="message-interval" 
                  type="number" 
                  placeholder="Ex: 60" 
                  value={messageInterval}
                  onChange={(e) => setMessageInterval(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Canais conectados</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                      Selecionar ({selectedInstanceNames.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Conectados (open)</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {connectedInstances.length === 0 ? (
                      <DropdownMenuLabel className="text-muted-foreground">Nenhum canal</DropdownMenuLabel>
                    ) : (
                      connectedInstances.map((inst) => (
                    <DropdownMenuCheckboxItem
                          key={inst.name}
                          checked={selectedInstanceNames.includes(inst.name)}
                          onCheckedChange={(checked) => {
                            setSelectedInstanceNames((prev) =>
                              checked ? [...prev, inst.name] : prev.filter((nm) => nm !== inst.name)
                            )
                          }}
                        >
                          {inst.profileName || inst.name}
                        </DropdownMenuCheckboxItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedInstanceNames
                  .map((nm) => connectedInstances.find((i) => i.name === nm))
                  .filter(Boolean)
                  .map((inst) => (
                    <Badge key={inst!.name} variant="secondary">
                      {inst!.profileName || inst!.name}
                    </Badge>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Mensagem</Label>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                        <LayoutTemplate className="mr-2 h-3 w-3" />
                        Usar modelo
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Selecione um modelo</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {templates.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">Nenhum modelo</div>
                      ) : (
                        templates.map(t => (
                          <DropdownMenuItem key={t.id} onClick={() => setMessage(t.content)}>
                            {t.name}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                        <Maximize2 className="mr-2 h-3 w-3" />
                        Expandir
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Editor de Mensagem</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 py-4">
                        <Textarea 
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="h-full resize-none font-mono text-sm"
                          placeholder="Digite sua mensagem aqui..."
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={() => setIsExpanded(false)}>Concluir</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <Textarea 
                id="message" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Olá {nome}, tudo bem?" 
                className="h-[100px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Dica: Use {"{nome}"} para personalizar com o nome do contato.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox 
                  id="ai-merge"
                  checked={aiMerge}
                  onCheckedChange={(checked) => setAiMerge(!!checked)}
                />
                <Label htmlFor="ai-merge">Mesclar mensagem com IA</Label>
              </div>
            </div>
          </div>

          {(() => {
            const toDateWithTimeLocal = (date: Date, time: string) => {
              const parts = String(time || "").split(":")
              const hh = Number(parts[0] || 0)
              const mm = Number(parts[1] || 0)
              const ss = Number(parts[2] || 0)
              const d = new Date(date)
              d.setHours(hh, mm, ss, 0)
              return d
            }
            const leadsCount = leads.length
            const leadsPerBlockN = Math.max(1, Number(splitCount) || 1)
            const intervalN = Math.max(1, Number(messageInterval) || 1)
            
            let maxSteps = 0
            if (leadsCount > 0) {
               const blocksCount = Math.ceil(leadsCount / leadsPerBlockN)
               
               // Option A: End of the last block
               const lastBlockIdx = blocksCount - 1
               const itemsInLastBlock = leadsCount - (lastBlockIdx * leadsPerBlockN)
               const lastBlockMaxDelayIdx = itemsInLastBlock - 1
               const timeLast = lastBlockIdx + lastBlockMaxDelayIdx
               
               // Option B: End of the second-to-last block (if exists)
               const timeSecondLast = (blocksCount >= 2) 
                  ? (blocksCount - 2) + (leadsPerBlockN - 1) 
                  : 0
                  
               maxSteps = Math.max(timeLast, timeSecondLast)
            }
            
            const durationSec = maxSteps * intervalN
            
            const startAt = startDate ? toDateWithTimeLocal(startDate, startTime) : null
            const lastDeliveryAt = startAt ? new Date(startAt.getTime() + durationSec * 1000) : null
            const formatDuration = (secTotal: number) => {
              const s = Math.max(0, Math.floor(secTotal))
              const h = Math.floor(s / 3600)
              const m = Math.floor((s % 3600) / 60)
              const r = s % 60
              if (h > 0 && m > 0) return `${h} hora${h > 1 ? "s" : ""} e ${m} minuto${m > 1 ? "s" : ""}`
              if (h > 0) return `${h} hora${h > 1 ? "s" : ""}`
              if (m > 0) return `${m} minuto${m > 1 ? "s" : ""}`
              return `${r} segundo${r > 1 ? "s" : ""}`
            }
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Estimativa de Envio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">Divisão: {leadsPerBlockN} • Intervalo: {intervalN} seg</div>
                  <div className="font-medium">Duração total: {formatDuration(durationSec)}</div>
                  <div className="text-sm text-muted-foreground">
                    O envio terminará em: <span className="font-semibold text-foreground">{formatBrazilDateTime(lastDeliveryAt)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Salvando..." : "Confirmar Agendamento"}
              </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
