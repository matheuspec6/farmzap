"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"
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

export const description = "A bar chart with a label"

type Item = { label: string; envios: number }

const chartConfig = {
  envios: {
    label: "Envios",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function ChartBarLabel({ range }: { range?: DateRange }) {
  const [data, setData] = React.useState<Item[]>([{ label: "Total", envios: 0 }])
  const [subtitle, setSubtitle] = React.useState<string>("")

  React.useEffect(() => {
    const load = async () => {
      let start: Date | undefined
      let end: Date | undefined
      if (range?.from && range?.to) {
        start = new Date(range.from)
        end = new Date(range.to)
      } else {
        const year = new Date().getFullYear()
        start = new Date(year, 11, 26)
        end = new Date(year, 11, 27)
      }
      if (!start || !end) {
        setData([{ label: "Total", envios: 0 }])
        setSubtitle("")
        return
      }
      end.setHours(23, 59, 59, 999)
      try {
        const { data: rows, error } = await supabase
          .from("leads")
          .select("sent_at")
          .eq("status", "enviado")
          .gte("sent_at", start.toISOString())
          .lte("sent_at", end.toISOString())
        if (error || !Array.isArray(rows)) {
          setData([{ label: "Total", envios: 0 }])
        } else {
          const counts = new Map<string, number>()
          for (const r of rows as { sent_at: string }[]) {
            const d = new Date(r.sent_at)
            const dd = String(d.getDate()).padStart(2, "0")
            const mm = String(d.getMonth() + 1).padStart(2, "0")
            const key = `${dd}/${mm}`
            counts.set(key, (counts.get(key) || 0) + 1)
          }
          const items: Item[] = Array.from(counts.entries()).map(([label, envios]) => ({
            label,
            envios,
          }))
          items.sort((a, b) => {
            const parse = (s: string) => {
              const [dd, mm] = s.split("/")
              return new Date(new Date().getFullYear(), Number(mm) - 1, Number(dd)).getTime()
            }
            return parse(a.label) - parse(b.label)
          })
          setData(items.length ? items : [{ label: "Total", envios: 0 }])
        }
        const fmt = (d: Date) =>
          d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
        setSubtitle(`${fmt(start)} - ${fmt(end)}`)
      } catch {
        setData([{ label: "Total", envios: 0 }])
        setSubtitle("")
      }
    }
    load()
  }, [range?.from, range?.to])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Total de Envios</CardTitle>
        <CardDescription>{subtitle || "Selecione um período"}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={data} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="envios" fill="var(--color-envios)" radius={8}>
              <LabelList dataKey="envios" position="top" offset={12} className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
