import { Worker } from "bullmq"
import { getQueue } from "./queue"
import { supabase } from "@/lib/supabase"

const workers = new Map<string, Worker>()

// Função auxiliar para buscar instâncias conectadas na Evolution API
async function getConnectedInstances(): Promise<string[]> {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL
    const apiKey = process.env.EVOLUTION_API_KEY
    if (!apiUrl || !apiKey) return []

    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000) // Timeout curto de 5s para listagem

    const res = await fetch(`${apiUrl}/instance/fetchInstances`, {
      headers: { 
        apikey: apiKey,
        "Content-Type": "application/json"
      },
      signal: controller.signal
    })
    
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data) ? data : (data.instances || [])
    
    // Filtra apenas instâncias com status "open" (conectadas)
    return list
      .filter((i: any) => {
        const status = (i.connectionStatus || i.status || "").toLowerCase()
        return status === "open"
      })
      .map((i: any) => i.instanceName || i.name || i.instance)
      .filter(Boolean)
  } catch (e) {
    console.error("Failover: Erro ao buscar instâncias", e)
    return []
  }
}

async function withTimeout<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("job_timeout")), ms)
    fn().then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export function ensureWorker(url?: string): Worker {
  const key = url || process.env.REDIS_URL || "redis://127.0.0.1:6379"
  if (!workers.has(key)) {
    const w = new Worker(
      "sendMessages",
      async job => {
        return await withTimeout(35000, async () => {
          const data = job.data as {
          baseUrl: string
          instance: string
          number: string
          text: string
          campaignId?: string
          blockIndex?: number
          delay?: number
          attemptedInstances?: string[] // Rastreia instâncias já tentadas
          provider?: string
          }
          let timeoutId: any = undefined
          let controller: AbortController | undefined = undefined

          try {
          const campaignId = data.campaignId
          if (campaignId) {
            try {
              const { data: campaign } = await supabase
                .from("campaigns")
                .select("status")
                .eq("id", campaignId)
                .maybeSingle()
              const status = String(campaign?.status || "")
              if (status === "cancelado" || status === "excluido") {
                return { ok: true, skipped: true, reason: status, campaignId }
              }
            } catch {}
          }

          controller = new AbortController()
          timeoutId = setTimeout(() => controller?.abort(), 30000)
          let ok = false
          let status = 0
          let body: any = null
          let endpoint = ""
          let payload: any = {}

          if (data.provider === "uazapi") {
            const uazapiUrl = (process.env.UAZAPI_ADMIN_URL || process.env.UAZAPI_URL || "https://free.uazapi.com").replace(/\/$/, "")
            const envToken = (process.env.UAZAPI_TOKEN || "").trim()
            let uazapiToken = String((data as any).uazapiToken || envToken || "").trim()
            
            if (!uazapiToken) {
              const name = String((data as any).instance || "").trim()
              if (name) {
                try {
                  const { data: setting } = await supabase
                    .from("app_settings")
                    .select("value")
                    .eq("key", `uazapi_token_${name}`)
                    .maybeSingle()
                  if (setting?.value) {
                    uazapiToken = String(setting.value).trim()
                  }
                } catch {}
              }
            }
            
            console.log(`[Worker] Processando envio Uazapi para ${data.number}`)

            if (!uazapiUrl || !uazapiToken) {
               throw new Error("Configuração da Uazapi incompleta (URL ou Token ausente)")
            }

            const hasChoices = Array.isArray((data as any).choices) && ((data as any).choices).length > 0
            if (hasChoices) {
              endpoint = `${uazapiUrl}/send/menu`
              payload = {
                number: data.number,
                type: "button",
                text: data.text,
                choices: (data as any).choices,
                footerText: (data as any).footerText || undefined,
                imageButton: (data as any).imageButton || undefined
              }
            } else {
              endpoint = `${uazapiUrl}/send/text`
              payload = {
                number: data.number,
                text: data.text
              }
            }

            const resp = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "token": uazapiToken
              },
              body: JSON.stringify(payload),
              signal: controller.signal
            })
            
            if (timeoutId) clearTimeout(timeoutId)
            status = resp.status
            ok = resp.ok // Uazapi retorna 200/201 como ok
            
            try {
               const txt = await resp.text()
               try { body = JSON.parse(txt) } catch { body = txt }
            } catch {}

            // Validação específica da Uazapi
            // Exemplo de sucesso: [{ key: { remoteJid: ... }, status: "PENDING" }]
            // Se vier array vazio ou erro, consideramos falha?
            // A princípio, se status for 200, consideramos enviado.
            
          } else {
            // Lógica padrão (Evolution API)
            endpoint = `${process.env.EVOLUTION_API_URL || data.baseUrl}/message/sendText/${data.instance}`
            payload = {
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
              signal: controller.signal
            })

            if (timeoutId) clearTimeout(timeoutId)
            status = resp.status
            ok = resp.ok

            if (!ok && (status >= 500 || status === 429)) {
               throw new Error(`Evolution API Error: ${status} ${resp.statusText}`)
            }

            try {
              const txt = await resp.text()
              try { body = JSON.parse(txt) } catch { body = txt }
            } catch {}
          }
          
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
              
              // Só atualiza como falha definitiva se NÃO for lançar erro (ou seja, erros 400/401/404 que não adianta tentar de novo)
              // Se o job falhar por throw, o BullMQ não executa isso agora, só quando esgotar as tentativas
              await supabase
                .from("leads")
                .update({ status: ok ? "enviado" : "falhou", error_reason, sent_at: ok ? new Date().toISOString() : null, custom_fields: updatedExtras })
                .eq("campaign_id", campaignId)
                .eq("phone", phone)
            } catch {}
            
            // Atualiza status da campanha
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
          
          return { ok, status, body, endpoint, payload, campaignId, blockIndex: data.blockIndex }

          } catch (err: any) {
            if (timeoutId) clearTimeout(timeoutId)
          
            // LÓGICA DE FAILOVER (Troca de Instância em caso de erro)
            const currentInstance = data.instance
            const attempted = new Set(data.attemptedInstances || [])
            attempted.add(currentInstance)

            // Só tenta failover se for erro de rede/servidor e tivermos campaignId (envio crítico)
            // Ignora se for erro 400 (Bad Request - provavelmente número inválido) a menos que seja timeout
            // E ignora se for Uazapi (pois não usa sistema de instâncias da Evolution)
            const isRecoverable = true 

            if (isRecoverable && data.campaignId && data.provider !== 'uazapi') {
               console.log(`[Failover] Falha na instância ${currentInstance}. Tentando buscar alternativa...`)
             
               // Busca instâncias online AGORA
               const onlineInstances = await getConnectedInstances()
             
               // Encontra uma instância que esteja online e AINDA NÃO foi tentada neste job
               const nextInstance = onlineInstances.find(name => !attempted.has(name))

               if (nextInstance) {
                 console.log(`[Failover] Migrando job de ${currentInstance} para ${nextInstance}`)
               
                 const redisUrl = url || process.env.REDIS_URL || "redis://127.0.0.1:6379"
                 const queue = getQueue(redisUrl)
               
                 // Recria o job na fila com a nova instância
                 await queue.add(job.name, {
                   ...data,
                   instance: nextInstance,
                   attemptedInstances: Array.from(attempted)
                 }, {
                   delay: 1000, // Espera 1s antes de tentar na nova
                   priority: 1, // Alta prioridade para retries
                   removeOnComplete: { count: 1000, age: 24 * 3600 },
                   removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
                   attempts: 5,
                   backoff: { type: "exponential", delay: 10000 }
                 })

                 // Retorna sucesso "falso" para remover este job da falha e evitar retry na instância ruim
                 return { 
                   ok: false, 
                   failover: true, 
                   originalError: err.message, 
                   migratedTo: nextInstance,
                   previousInstance: currentInstance
                 }
               } else {
                 console.warn(`[Failover] Nenhuma outra instância disponível. Tentativas: ${Array.from(attempted).join(", ")}`)
               }
            }

            throw err // Se não conseguiu failover, relança o erro para o BullMQ gerenciar o retry padrão
          }
        })
      },
      { 
        connection: { url: key },
        concurrency: 3, // Processa 3 mensagens simultaneamente
        limiter: { max: 10, duration: 1000 },
        lockDuration: 35000, // Garante que o job não expire enquanto processa (35s)
        stalledInterval: 10000,
        maxStalledCount: 2
      }
    )
    w.on("error", (err) => {
      console.error("Worker error:", err?.message || err)
    })
    workers.set(key, w)
  }
  return workers.get(key)!
}
