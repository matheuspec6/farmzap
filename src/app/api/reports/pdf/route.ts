import { supabase } from "@/lib/supabase"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

const A4: [number, number] = [595.28, 841.89]

const formatDateTime = (iso?: string | null, tz?: string) => {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("pt-BR", tz ? { timeZone: tz } : undefined)
  } catch {
    return new Date(iso).toLocaleString("pt-BR")
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const campaignId = url.searchParams.get("campaignId")
    if (!campaignId) {
      return new Response("missing_campaignId", { status: 400 })
    }

    const { data: campaign, error: cErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle()
    if (cErr) return new Response(cErr.message, { status: 500 })
    if (!campaign) return new Response("campaign_not_found", { status: 404 })

    const { data: leads, error: lErr } = await supabase
      .from("leads")
      .select("name, phone, status, sent_at, custom_fields")
      .eq("campaign_id", campaignId)
      .order("name", { ascending: true })
    if (lErr) return new Response(lErr.message, { status: 500 })

    const tz = (campaign?.settings && campaign.settings.timezone) || "America/Sao_Paulo"
    const started = (campaign?.settings && campaign.settings.schedule_start) || campaign?.start_date
    const ended = (campaign?.settings && campaign.settings.schedule_end) || campaign?.end_date

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    let page = pdfDoc.addPage(A4)
    const { width, height } = page.getSize()
    const margin = 30
    let y = height - margin

    const title = `Relatório - ${String(campaign?.name || "Campanha").trim()}`
    page.drawText(title, { x: margin, y, size: 18, font, color: rgb(0, 0, 0) })
    y -= 24
    const info = `Início: ${formatDateTime(started, tz)} • Fim: ${formatDateTime(ended, tz)} • Leads: ${Array.isArray(leads) ? leads.length : 0}`
    page.drawText(info, { x: margin, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) })
    y -= 20

    const headers = ["Canal", "Nome", "Telefone", "Status", "Data/Hora"]
    const contentWidth = width - margin * 2
    const baseCols = [90, 150, 110, 70]
    const lastCol = Math.max(60, contentWidth - baseCols.reduce((a, b) => a + b, 0))
    const cols = [...baseCols, lastCol]
    const fitText = (text: string, maxW: number, size = 10) => {
      let t = String(text || "")
      if (!t) return "-"
      let w = font.widthOfTextAtSize(t, size)
      if (w <= maxW) return t
      // trim and add ellipsis
      const ell = "…"
      while (t.length > 0 && font.widthOfTextAtSize(t + ell, size) > maxW) {
        t = t.slice(0, -1)
      }
      return t ? t + ell : "-"
    }
    const drawHeaders = () => {
      let x = margin
      headers.forEach((h, idx) => {
        page.drawText(h, { x, y, size: 11, font, color: rgb(0, 0, 0) })
        x += cols[idx]
      })
    }
    drawHeaders()
    y -= 16

    const drawRow = (row: { canal: string; nome: string; telefone: string; status: string; datetime: string }) => {
      if (y < margin + 40) {
        page = pdfDoc.addPage(A4)
        const sz = page.getSize()
        y = sz.height - margin
        drawHeaders()
        y -= 16
      }
      let x = margin
      page.drawText(fitText(row.canal || "-", cols[0]), { x, y, size: 10, font }); x += cols[0]
      page.drawText(fitText(row.nome || "-", cols[1]), { x, y, size: 10, font }); x += cols[1]
      page.drawText(fitText(row.telefone || "-", cols[2]), { x, y, size: 10, font }); x += cols[2]
      const statusNorm = String(row.status || "").toLowerCase()
      const color = statusNorm === "enviado" ? rgb(0, 0.6, 0) : statusNorm === "falhou" || statusNorm === "erro" ? rgb(0.85, 0, 0) : rgb(0.3, 0.3, 0.3)
      page.drawText(fitText(row.status || "-", cols[3]), { x, y, size: 10, font, color }); x += cols[3]
      page.drawText(fitText(row.datetime || "-", cols[4]), { x, y, size: 10, font })
      y -= 14
    }

    const instancesList: string[] = Array.isArray(campaign?.settings?.instances) ? (campaign.settings.instances as string[]) : []
    const normalized = (Array.isArray(leads) ? leads : []).map((l: any) => {
      const extras = typeof l?.custom_fields === "object" && l.custom_fields ? l.custom_fields : {}
      const canalRaw = String(extras?.instance || extras?.canal || extras?.instancia || "").trim()
      const canal = canalRaw || (instancesList.length === 1 ? String(instancesList[0]) : "-")
      const nome = String(l?.name || "").trim()
      const telefone = String(l?.phone || "").replace(/\D/g, "")
      const status = String(l?.status || "").trim()
      const datetime = l?.sent_at ? formatDateTime(l.sent_at, tz) : "-"
      return { canal, nome, telefone, status, datetime }
    })

    for (const row of normalized) {
      drawRow(row)
    }

    const pdfBytes = await pdfDoc.save()
    const filename = `relatorio-${String(campaign?.name || "campanha").replace(/[^\w\-]+/g, "-")}.pdf`
    const ab = new Uint8Array(pdfBytes).buffer
    return new Response(ab, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e: any) {
    return new Response(String(e?.message || e || "error_generating_pdf"), { status: 500 })
  }
}
