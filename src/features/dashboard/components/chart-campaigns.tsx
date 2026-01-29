"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { supabase } from "@/lib/supabase"
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
  type ChartConfig,
} from "@/components/ui/chart"
import { type DateRange } from "react-day-picker"

type Item = { label: string; enviados: number }

const chartConfig = {
  enviados: {
    label: "Enviados",
    color: "hsl(var(--primary))",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig

export function ChartCampaigns({ range }: { range?: DateRange }) {
  const [data, setData] = React.useState<Item[]>([])
  const [subtitle, setSubtitle] = React.useState<string>("")

  React.useEffect(() => {
    const load = async () => {
      try {
        let start: Date | undefined
        let end: Date | undefined
        if (range?.from && range?.to) {
          start = new Date(range.from)
          end = new Date(range.to)
          end.setHours(23, 59, 59, 999)
        }

        const { data: campaigns, error: cErr } = await supabase
          .from("campaigns")
          .select("id,name,status,created_at")
          .neq("status", "excluido")
          .order("created_at", { ascending: false })
        if (cErr || !Array.isArray(campaigns)) {
          setData([])
          setSubtitle("")
          return
        }
        let counts = new Map<string, number>()
        if (start && end) {
          const { data: rows } = await supabase
            .from("leads")
            .select("campaign_id, sent_at")
            .eq("status", "enviado")
            .gte("sent_at", start.toISOString())
            .lte("sent_at", end.toISOString())
          counts = new Map<string, number>()
          if (Array.isArray(rows)) {
            for (const r of rows as { campaign_id: string; sent_at: string }[]) {
              const id = String(r.campaign_id)
              counts.set(id, (counts.get(id) || 0) + 1)
            }
          }
        } else {
          const { data: stats } = await supabase
            .from("campaign_stats")
            .select("campaign_id,sent_count")
          if (Array.isArray(stats)) {
            for (const s of stats) {
              counts.set(String(s.campaign_id), Number(s.sent_count || 0))
            }
          }
        }

        const items: Item[] = campaigns.map((c: any) => {
          const enviados = counts.has(c.id) ? (counts.get(c.id) as number) : 0
          return {
            label: String(c.name || "").trim(),
            enviados,
          }
        })
        const filtered = items.filter((it) => it.enviados > 0)
        filtered.sort((a, b) => b.enviados - a.enviados)
        setData(filtered)
        if (start && end) {
          const fmt = (d: Date) =>
            d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
          setSubtitle(`${fmt(start)} - ${fmt(end)}`)
        } else {
          setSubtitle(`${filtered.length} campanha(s)`)
        }
      } catch {
        setData([])
        setSubtitle("")
      }
    }
    load()
  }, [range?.from, range?.to])

  const fit = (s: string, max = 22) => {
    const t = String(s || "")
    return t.length > max ? t.slice(0, max - 1) + "…" : t
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campanhas</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ right: 16 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value: string) => fit(value)}
              hide
            />
            <XAxis dataKey="enviados" type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Bar dataKey="enviados" layout="vertical" fill="var(--color-enviados)" radius={4}>
              <LabelList
                dataKey="label"
                position="insideLeft"
                offset={8}
                className="fill-white"
                fontSize={12}
                formatter={(value: any) => fit(String(value))}
              />
              <LabelList
                dataKey="enviados"
                position="right"
                offset={8}
                className="fill-white"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
