import { Worker } from "bullmq"
import { supabase } from "@/lib/supabase"

const workers = new Map<string, Worker>()

export function ensureWorker(url?: string): Worker {
  const key = url || process.env.REDIS_URL || "redis://127.0.0.1:6379"
  if (!workers.has(key)) {
    const w = new Worker(
      "sendMessages",
      async job => {
        const data = job.data as {
          baseUrl: string
          instance: string
          number: string
          text: string
          campaignId?: string
          blockIndex?: number
          delay?: number
        }
        const endpoint = `${process.env.EVOLUTION_API_URL || data.baseUrl}/message/sendText/${data.instance}`
        const payload = {
          number: data.number,
          text: data.text,
          delay: typeof data.delay === "number" ? data.delay : 0,
          linkPreview: true,
        }
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            apikey: process.env.EVOLUTION_API_KEY || "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
        const ok = resp.ok
        let body: any = null
        try {
          const txt = await resp.text()
          try {
            body = JSON.parse(txt)
          } catch {
            body = txt
          }
        } catch {}
        const campaignId = data.campaignId
        const phone = String(data.number || "").replace(/\D/g, "")
        if (campaignId && phone) {
          try {
            const error_reason = ok ? null : (typeof body === "string" ? body : JSON.stringify(body))
            let extras: any = {}
            try {
              const { data: leadRow } = await supabase
                .from("leads")
                .select("id, custom_fields")
                .eq("campaign_id", campaignId)
                .eq("phone", phone)
                .maybeSingle()
              if (leadRow && typeof leadRow.custom_fields === "object" && leadRow.custom_fields) {
                extras = leadRow.custom_fields
              }
            } catch {}
            const updatedExtras = { ...(extras || {}), instance: data.instance }
            await supabase
              .from("leads")
              .update({ status: ok ? "enviado" : "falhou", error_reason, sent_at: ok ? new Date().toISOString() : null, custom_fields: updatedExtras })
              .eq("campaign_id", campaignId)
              .eq("phone", phone)
          } catch {}
          try {
            const { data: stats } = await supabase
              .from("campaign_stats")
              .select("*")
              .eq("campaign_id", campaignId)
              .maybeSingle()
            if (stats) {
              const pending = Number(stats.pending_count || 0)
              const scheduled = Number(stats.scheduled_count || 0)
              const next = pending + scheduled > 0 ? "processando" : "concluido"
              await supabase
                .from("campaigns")
                .update({ status: next })
                .eq("id", campaignId)
            }
          } catch {}
        }
        return { ok, status: resp.status, body, endpoint, payload, campaignId, blockIndex: data.blockIndex }
      },
      { connection: { url: key } }
    )
    w.on("error", (err) => {
      console.error("Worker error:", err?.message || err)
    })
    workers.set(key, w)
  }
  return workers.get(key)!
}
