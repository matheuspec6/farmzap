 "use client"
 
 import * as React from "react"
 import { Bar, BarChart, XAxis, CartesianGrid } from "recharts"
 import { supabase } from "@/lib/supabase"
import { CheckCircle, X } from "lucide-react"
 import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
 } from "@/components/ui/card"
 import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
   type ChartConfig,
 } from "@/components/ui/chart"
 
 type Item = { name: string; positivo: number; negativo: number }
 
 const chartConfig = {
   positivo: {
     label: "Positivas",
    color: "hsl(var(--primary))",
    icon: CheckCircle,
   },
   negativo: {
     label: "Negativas",
    color: "hsl(var(--primary) / 0.35)",
    icon: X,
   },
 } satisfies ChartConfig
 
 export function ChartResponses() {
   const [data, setData] = React.useState<Item[]>([])
   const [subtitle, setSubtitle] = React.useState<string>("")
 
   React.useEffect(() => {
     const load = async () => {
       try {
         const { data: campaigns, error } = await supabase
           .from("campaigns")
           .select("id,name,status,created_at")
           .neq("status", "excluido")
           .order("created_at", { ascending: false })
         if (error || !Array.isArray(campaigns)) {
           setData([])
           setSubtitle("")
           return
         }
         const items: Item[] = (campaigns || []).map((c: any) => {
           const total = 10 + Math.floor(Math.random() * 20)
           const positivo = Math.floor(total / 2)
           const negativo = total - positivo
           return { name: String(c.name || "").trim(), positivo, negativo }
         })
         setData(items)
         setSubtitle(`${items.length} campanha(s)`)
       } catch {
         setData([])
         setSubtitle("")
       }
     }
     load()
   }, [])
 
   return (
     <Card>
       <CardHeader>
         <CardTitle>Respostas por Campanha</CardTitle>
         <CardDescription>{subtitle}</CardDescription>
       </CardHeader>
       <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
           <BarChart accessibilityLayer data={data}>
             <CartesianGrid vertical={false} />
             <XAxis
               dataKey="name"
               tickLine={false}
               tickMargin={10}
               axisLine={false}
             />
             <Bar dataKey="positivo" stackId="a" fill="var(--color-positivo)" radius={[0, 0, 4, 4]} />
             <Bar dataKey="negativo" stackId="a" fill="var(--color-negativo)" radius={[4, 4, 0, 0]} />
             <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
            <ChartLegend content={<ChartLegendContent />} />
           </BarChart>
         </ChartContainer>
       </CardContent>
     </Card>
   )
 }
