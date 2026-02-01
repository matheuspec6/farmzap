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
          attemptedInstances?: string[] // Rastreia instâncias já tentadas
        }
        
        // Configura Timeout de 30s para a requisição
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        try {
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
            signal: controller.signal
          })

          clearTimeout(timeoutId)
          const ok = resp.ok
          
          // Se for erro de servidor (5xx) ou Rate Limit (429), lança erro para o BullMQ tentar novamente
          if (!ok && (resp.status >= 500 || resp.status === 429)) {
            throw new Error(`Evolution API Error: ${resp.status} ${resp.statusText}`)
          }

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
          
          return { ok, status: resp.status, body, endpoint, payload, campaignId, blockIndex: data.blockIndex }

        } catch (err: any) {
          clearTimeout(timeoutId)
          
          // LÓGICA DE FAILOVER (Troca de Instância em caso de erro)
          const currentInstance = data.instance
          const attempted = new Set(data.attemptedInstances || [])
          attempted.add(currentInstance)

          // Só tenta failover se for erro de rede/servidor e tivermos campaignId (envio crítico)
          // Ignora se for erro 400 (Bad Request - provavelmente número inválido) a menos que seja timeout
          const isRecoverable = true // Vamos tentar recuperar qualquer erro por segurança, exceto se soubermos que é o número

          if (isRecoverable && data.campaignId) {
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
                 removeOnComplete: { count: 2000, age: 24 * 3600 },
                 removeOnFail: { count: 5000, age: 7 * 24 * 3600 }
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
      },
      { 
        connection: { url: key },
        concurrency: 5, // Processa 5 mensagens simultaneamente
        lockDuration: 30000 // Garante que o job não expire enquanto processa (30s)
      }
    )
    w.on("error", (err) => {
      console.error("Worker error:", err?.message || err)
    })
    workers.set(key, w)
  }
  return workers.get(key)!
}
