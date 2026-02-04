import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

const UAZAPI_ADMIN_URL = process.env.UAZAPI_ADMIN_URL || process.env.UAZAPI_URL
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN

const CACHE_TTL_MS = 5000
let uazapiCache: { ts: number; items: any[] } | null = null
let evolutionCache: { ts: number; items: any[] } | null = null

function normalize(s: any) {
  return (s ?? '').toString().toLowerCase().trim()
}

export async function GET(request: Request) {
  let provider: string = "evolution"
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "default_provider")
      .maybeSingle()
    if (data?.value) provider = String(data.value)
  } catch {}

  let title: string | undefined = undefined
  try {
    const url = new URL(request.url)
    const t = url.searchParams.get("title")
    if (t) title = t
  } catch {}
  const cmpTitle = title ? normalize(title) : ""

  if (provider === "uazapi" && UAZAPI_ADMIN_URL && UAZAPI_ADMIN_TOKEN) {
    try {
      let items: any[] = []
      const fresh = uazapiCache && (Date.now() - uazapiCache.ts) < CACHE_TTL_MS
      if (fresh) {
        items = uazapiCache!.items
      } else {
        const url = UAZAPI_ADMIN_URL.replace(/\/$/, '') + '/instance/all'
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            admintoken: UAZAPI_ADMIN_TOKEN,
          },
          cache: 'no-store',
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!response.ok) {
          console.error('Uazapi Admin error:', response.status, response.statusText)
          if (uazapiCache?.items?.length) {
            items = uazapiCache.items
          }
        } else {
          const data = await response.json()
          items = Array.isArray(data) ? data : []
          uazapiCache = { ts: Date.now(), items }
        }
      }

      if (items.length) {
        const mapped = items.map((inst: any) => {
          const rawStatus = normalize(inst.status)
          const status =
            rawStatus === 'connected' ? 'connected' :
            rawStatus === 'connecting' ? 'connecting' :
            rawStatus === 'disconnected' ? 'disconnected' :
            (inst.status ?? 'unknown')
          return {
            id: inst.id,
            key: inst.id || inst.name,
            name: inst.name,
            profileName: inst.profileName || inst.name,
            status,
            profilePicUrl: inst.profilePicUrl || '',
            ownerJid: inst.owner ? `${String(inst.owner).replace(/\D/g, '')}@s.whatsapp.net` : undefined,
            token: inst.token,
            isBusiness: !!inst.isBusiness,
            platform: inst.plataform || inst.platform || '',
            systemName: inst.systemName || '',
            adminField01: inst.adminField01 || '',
          }
        })
        const instances = cmpTitle ? mapped.filter((it: any) => normalize(it.adminField01) === cmpTitle) : mapped
        return NextResponse.json({ instances })
      }
    } catch (error) {
      console.error('API Uazapi Instances Error:', error)
    }
  }

  // Evolution API
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return NextResponse.json({ instances: [] }, { status: 200 })
  }

  try {
    let items: any[] = []
    const fresh = evolutionCache && (Date.now() - evolutionCache.ts) < CACHE_TTL_MS
    if (fresh) {
      items = evolutionCache!.items
    } else {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        console.error('Evolution API error:', response.status, response.statusText)
        if (evolutionCache?.items?.length) {
          items = evolutionCache.items
        } else {
          return NextResponse.json({ instances: [] }, { status: 200 })
        }
      } else {
        const data = await response.json()
        if (!data) {
          return NextResponse.json({ instances: [] }, { status: 200 })
        }
        items = Array.isArray(data) ? data : (data.instances || [])
        evolutionCache = { ts: Date.now(), items }
      }
    }

    const instances = items
      .map((it: any) => it.instance || it)
      .filter((inst: any) => {
        return true
      })
      .map((inst: any) => ({
        id: inst.instanceId || inst.id,
        key: inst.instanceName || inst.id || inst.name,
        name: inst.name,
        profileName: inst.profileName || inst.instanceName || inst.name,
        status: (() => {
          const n = normalize(inst.connectionStatus ?? inst.status ?? '')
          return n === 'open' ? 'connected'
              : n === 'connecting' ? 'connecting'
              : (n === 'close' || n === 'closed') ? 'disconnected'
              : (inst.connectionStatus ?? inst.status ?? 'unknown')
        })(),
        profilePicUrl: inst.profilePicUrl || '',
        ownerJid: inst.ownerJid || undefined,
      }))

    return NextResponse.json({ instances })
  } catch (error) {
    console.error('API Instances Error:', error)
    return NextResponse.json({ instances: [] }, { status: 200 })
  }
}

export async function POST(request: Request) {
  let provider: string = "evolution"
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "default_provider")
      .maybeSingle()
    if (data?.value) provider = String(data.value)
  } catch {}

  try {
    const body = await request.json().catch(() => ({}))
    const name: string = String(body?.name ?? "").trim()
    const adminField01: string | undefined = body?.adminField01 ? String(body.adminField01) : undefined

    if (!name) {
      return NextResponse.json({ ok: false, message: "Nome da instância é obrigatório" }, { status: 400 })
    }

    if (provider === "uazapi" && UAZAPI_ADMIN_URL && UAZAPI_ADMIN_TOKEN) {
      const url = UAZAPI_ADMIN_URL.replace(/\/$/, '') + '/instance/init'
      const payload = {
        name,
        systemName: 'apilocal',
        adminField01: adminField01 ?? 'custom-metadata-1',
        fingerprintProfile: 'chrome',
        browser: 'chrome',
      }
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            admintoken: UAZAPI_ADMIN_TOKEN,
          },
          body: JSON.stringify(payload),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          return NextResponse.json({ ok: false, status: response.status, message: data?.message ?? 'Erro ao criar instância' }, { status: 200 })
        }
        try {
          const token =
            String((data as any)?.token || "") ||
            String((data as any)?.data?.token || "") ||
            String((data as any)?.instance?.token || "") ||
            String((data as any)?.result?.token || "")
          const tk = token.trim()
          if (tk) {
            await supabase
              .from("app_settings")
              .upsert({ key: `uazapi_token_${name}`, value: tk, updated_at: new Date().toISOString() }, { onConflict: "key" })
          }
        } catch {}
        return NextResponse.json({ ok: true, data }, { status: 200 })
      } catch (error) {
        console.error('API Uazapi Instance Init Error:', error)
        return NextResponse.json({ ok: false, message: 'Falha na requisição ao Uazapi' }, { status: 200 })
      }
    }

    return NextResponse.json({ ok: false, message: 'Provider não suportado para criação' }, { status: 200 })
  } catch (error) {
    console.error('API Instances POST Error:', error)
    return NextResponse.json({ ok: false, message: 'Erro inesperado' }, { status: 200 })
  }
}
