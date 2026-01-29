 "use client"
 
 import * as React from "react"
 import { supabase } from "@/lib/supabase"
 import { Button } from "@/components/ui/button"
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card"
 import { SendIcon } from "lucide-react"
 import { Smartphone } from "lucide-react"
 import { MessageSquare } from "lucide-react"
 import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ChartBarLabel } from "@/features/dashboard/components/chart-bar-label"
import { ChartCampaigns } from "@/features/dashboard/components/chart-campaigns"
import { ChartResponses } from "@/features/dashboard/components/chart-responses"
 import { DatePickerWithRange } from "@/features/dashboard/components/date-picker-with-range"
 import { type DateRange } from "react-day-picker"
 import { Badge } from "@/components/ui/badge"
 
 export function DashboardOverviewClient() {
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    try {
      const saved = localStorage.getItem("dashboardRange")
      if (saved) {
        const parsed = JSON.parse(saved)
        const from = parsed?.from ? new Date(parsed.from) : undefined
        const to = parsed?.to ? new Date(parsed.to) : undefined
        if (from || to) {
          return { from, to }
        }
      }
    } catch {}
    const now = new Date()
    const from = new Date()
    from.setDate(now.getDate() - 7)
    return { from, to: now }
  })
   const [totalEnvios, setTotalEnvios] = React.useState<number | null>(null)
   const [loadingTotal, setLoadingTotal] = React.useState(false)
  const [instances, setInstances] = React.useState<{ name?: string; profileName?: string }[]>([])
  const [totalResponses, setTotalResponses] = React.useState<number | null>(null)
  const [secretNumber, setSecretNumber] = React.useState<number | null>(null)
 
 // range já inicializado com cache ou padrão; não precisa de efeito para carregar

  React.useEffect(() => {
    try {
      if (range?.from || range?.to) {
        const payload = {
          from: range?.from ? range.from.toISOString() : null,
          to: range?.to ? range.to.toISOString() : null,
        }
        localStorage.setItem("dashboardRange", JSON.stringify(payload))
      } else {
        localStorage.removeItem("dashboardRange")
      }
    } catch {}
  }, [range?.from, range?.to])

   const formatNumber = (n: number | null) => {
     if (n == null) return "-"
     return n.toLocaleString("pt-BR")
   }
 
   React.useEffect(() => {
     const fetchTotal = async () => {
       if (!range?.from || !range?.to) {
         setTotalEnvios(null)
         return
       }
       setLoadingTotal(true)
       try {
         const start = new Date(range.from)
         const end = new Date(range.to)
         end.setHours(23, 59, 59, 999)
         const { count, error } = await supabase
           .from("leads")
           .select("*", { count: "exact", head: true })
           .eq("status", "enviado")
           .gte("sent_at", start.toISOString())
           .lte("sent_at", end.toISOString())
         if (error) {
           setTotalEnvios(null)
         } else {
           setTotalEnvios(typeof count === "number" ? count : 0)
         }
       } catch {
         setTotalEnvios(null)
       } finally {
         setLoadingTotal(false)
       }
     }
     fetchTotal()
   }, [range?.from, range?.to])
 
 React.useEffect(() => {
   const loadInstances = async () => {
     try {
       const res = await fetch("/api/instances", { cache: "no-store" })
       const json = await res.json()
       const list = Array.isArray(json.instances) ? json.instances : []
       setInstances(list.map((i: any) => ({ name: i.name, profileName: i.profileName })))
     } catch {}
   }
   loadInstances()
 }, [])
 
  React.useEffect(() => {
    try {
      const base = 10
      const extra = Math.floor(Math.random() * 90)
      setTotalResponses(base + extra)
    } catch {
      setTotalResponses(null)
    }
  }, [range?.from, range?.to])
 
 React.useEffect(() => {
   try {
     const base = 100
     const extra = Math.floor(Math.random() * 900)
     setSecretNumber(base + extra)
   } catch {
     setSecretNumber(null)
   }
 }, [range?.from, range?.to])
 
   return (
     <Tabs defaultValue="overview" className="space-y-4">
       <TabsContent value="overview" className="space-y-4">
         <div className="flex justify-start">
           <DatePickerWithRange value={range} onChange={setRange} />
         </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">
                 Total de Envios
               </CardTitle>
               <SendIcon className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">
                 {loadingTotal ? "..." : formatNumber(totalEnvios)}
               </div>
             </CardContent>
           </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">
                Canais Ativos
               </CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
              <div className="text-2xl font-bold">{instances.length}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {instances.map((i, idx) => (
                  <Badge key={`${i.name}-${idx}`} variant="outline">
                    {i.profileName || i.name || "Instância"}
                  </Badge>
                ))}
              </div>
             </CardContent>
           </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Resposta</CardTitle>
               <MessageSquare className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
              <div className="text-2xl font-bold">{totalResponses ?? "-"}</div>
               <p className="text-xs text-muted-foreground">
                teste
               </p>
             </CardContent>
           </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Segredo</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
              <div className="text-2xl font-bold">{secretNumber ?? "-"}</div>
               <p className="text-xs text-muted-foreground">
                 
               </p>
             </CardContent>
           </Card>
         </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <ChartBarLabel range={range} />
          </div>
          <div className="col-span-3">
            <ChartCampaigns range={range} />
          </div>
         </div>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
          <div className="col-span-7">
            <ChartResponses />
          </div>
        </div>
       </TabsContent>
     </Tabs>
   )
 }
