import { NextResponse } from "next/server"
import { getQueue } from "@/server/queue"
import { ensureWorker } from "@/server/worker"
import { supabase } from "@/lib/supabase"
import Redis from "ioredis"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const blocks = Array.isArray(body.blocks) ? body.blocks : []
    const campaignId = body.campaignId ? String(body.campaignId) : undefined
    const baseUrl = process.env.EVOLUTION_API_URL || body.baseUrl || ""
    const intervalSec = Math.max(0, Number(body.intervalSec) || 0)
    const now = Date.now()

    // Busca provedor padrão (permite override pelo body.provider)
    let provider = body.provider ? String(body.provider) : "evolution"
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "default_provider")
        .maybeSingle()
      if (!body.provider && data?.value) provider = data.value
    } catch {}

    // Pré-carrega tokens das instâncias Uazapi (quando disponível)
    const tokensByName = new Map<string, string>()
    try {
      const adminUrl = (process.env.UAZAPI_ADMIN_URL || process.env.UAZAPI_URL || "").replace(/\/$/, "")
      const adminToken = process.env.UAZAPI_ADMIN_TOKEN || ""
      if (adminUrl && adminToken) {
        const resp = await fetch(`${adminUrl}/instance/all`, {
          headers: { Accept: "application/json", admintoken: adminToken },
          cache: "no-store",
        })
        if (resp.ok) {
          const json = await resp.json()
          if (Array.isArray(json)) {
            for (const it of json) {
              const nm = String(it?.name || "").trim()
              const tk = String(it?.token || "")
              if (nm && tk) tokensByName.set(nm, tk)
            }
          }
        }
      }
      try {
        const { data: tokenRows } = await supabase
          .from("app_settings")
          .select("key, value")
          .like("key", "uazapi_token_%")
        if (Array.isArray(tokenRows)) {
          for (const row of tokenRows) {
            const key = String(row.key || "")
            const nm = key.startsWith("uazapi_token_") ? key.substring("uazapi_token_".length) : ""
            const tk = String(row.value || "")
            if (nm && tk && !tokensByName.has(nm)) {
              tokensByName.set(nm, tk)
            }
          }
        }
      } catch {}
    } catch {}

    let count = 0
    let url = process.env.REDIS_URL || "redis://127.0.0.1:6379"
    if (body.redisUrl) {
      url = String(body.redisUrl)
    } else if (body.redisHost && body.redisPort) {
      const host = String(body.redisHost)
      const port = Number(body.redisPort)
      const pw = body.redisPassword ? String(body.redisPassword) : ""
      url = pw ? `redis://:${pw}@${host}:${port}` : `redis://${host}:${port}`
    }
    try {
      const probe = new Redis(url)
      await probe.ping()
      probe.disconnect()
    } catch (e) {
      return NextResponse.json({ error: "redis_unavailable" }, { status: 503 })
    }
    ensureWorker(url)
    const sendQueue = getQueue(url)
    const normalize = (s: any) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    const applyTemplate = (tpl: string, lead: any) => {
      const name = String(lead?.name ?? "")
      const phone = String(lead?.phone ?? "")
      const extras = typeof lead?.original === "object" && lead.original ? lead.original : {}
      const map = new Map<string, string>()
      map.set("nome", name)
      map.set("name", name)
      map.set("telefone", phone)
      map.set("whatsapp", phone)
      map.set("celular", phone)
      map.set("phone", phone)
      map.set("numero", phone)
      Object.keys(extras).forEach((k) => {
        const v = extras[k]
        map.set(k, String(v ?? ""))
        map.set(normalize(k), String(v ?? ""))
      })
      return String(tpl || "").replace(/\{([^}]+)\}/g, (_m, key) => {
        const k = String(key || "")
        const n = normalize(k)
        if (map.has(k)) return map.get(k) as string
        if (map.has(n)) return map.get(n) as string
        return _m
      })
    }
    for (const b of blocks) {
      const when = new Date(b.scheduledAt).getTime()
      const delay = Math.max(0, when - now)
      const instance = b.instance
      const blockIndex = typeof b.index === "number" ? Number(b.index) : undefined
      const list = Array.isArray(b.leads) ? b.leads : []
      for (let i = 0; i < list.length; i++) {
        const lead = list[i]
        const number = String(lead.phone || "").replace(/\D/g, "")
        let text = ""
        let choices: string[] | undefined = undefined
        let footerText: string | undefined = undefined
        let imageButton: string | undefined = undefined
        let jobProvider = provider
        // Suporte a modelo menu serializado em JSON no campo message
        const rawMsg = String(b.message || "")
        try {
          const parsed = JSON.parse(rawMsg)
          const isMenu = !!parsed && typeof parsed === "object" && ((parsed.type === "menu") || (Array.isArray(parsed.choices) && parsed.choices.length))
          if (isMenu) {
            text = applyTemplate(String(parsed.text || ""), lead)
            if (Array.isArray(parsed.choices) && parsed.choices.length) {
              choices = parsed.choices.map((c: any) => String(c))
            }
            footerText = parsed.footerText ? String(parsed.footerText) : undefined
            imageButton = parsed.imageButton ? String(parsed.imageButton) : undefined
            jobProvider = "uazapi"
          } else {
            text = applyTemplate(rawMsg, lead)
          }
        } catch {
          text = applyTemplate(rawMsg, lead)
        }
        if (!number || (jobProvider !== "uazapi" && !instance) || !text) continue
        const leadDelay = delay + i * intervalSec * 1000
        const jobData: any = { number, text, campaignId, blockIndex, delay: 0, provider: jobProvider }
        
        // Se for Evolution, adiciona baseUrl e instance. Se for Uazapi, não precisa.
        if (jobProvider !== "uazapi") {
           jobData.baseUrl = baseUrl
           jobData.instance = instance
        } else {
           if (choices && choices.length) jobData.choices = choices
           if (footerText) jobData.footerText = footerText
           if (imageButton) jobData.imageButton = imageButton
           const chosen = instance ? String(instance) : ""
           const tk = chosen ? (tokensByName.get(chosen) || "") : ""
           if (tk) jobData.uazapiToken = tk
        }

        await sendQueue.add(
          "send-text",
          jobData,
          { 
            delay: leadDelay, 
            removeOnComplete: { count: 1000, age: 24 * 3600 }, 
            removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
            attempts: 5, // Tenta enviar 5 vezes em caso de falha
            backoff: {
              type: 'exponential',
              delay: 10000 // Espera 10s, 20s, 40s entre tentativas
            }
          }
        )
        count++
      }
    }
    return NextResponse.json({ enqueued: count })
  } catch {
    return NextResponse.json({ enqueued: 0 }, { status: 200 })
  }
}
