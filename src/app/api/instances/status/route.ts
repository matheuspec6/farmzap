import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const UAZAPI_ADMIN_URL = process.env.UAZAPI_ADMIN_URL || process.env.UAZAPI_URL
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN

function normalize(s: any) {
  return (s ?? "").toString().toLowerCase().trim()
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

  if (provider !== "uazapi" || !UAZAPI_ADMIN_URL) {
    return NextResponse.json({ ok: false, message: "unsupported_provider" }, { status: 200 })
  }

  try {
    const url = new URL(request.url)
    const qName = String(url.searchParams.get("name") || "").trim()
    let token = (request.headers.get("token") || "").trim()

    if (!token && qName) {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", `uazapi_token_${qName}`)
          .maybeSingle()
        if (data?.value) token = String(data.value).trim()
      } catch {}
    }

    if (!token && UAZAPI_ADMIN_TOKEN && qName) {
      try {
        const listUrl = UAZAPI_ADMIN_URL.replace(/\/$/, "") + "/instance/all"
        const resp = await fetch(listUrl, {
          headers: { Accept: "application/json", admintoken: UAZAPI_ADMIN_TOKEN },
          cache: "no-store",
        })
        if (resp.ok) {
          const list = await resp.json()
          if (Array.isArray(list)) {
            const found = list.find((i: any) => normalize(i?.name) === normalize(qName))
            if (found?.token) token = String(found.token).trim()
          }
        }
      } catch {}
    }

    if (!token) {
      return NextResponse.json({ ok: false, message: "missing_instance_token" }, { status: 200 })
    }

    try {
      const endpoint = UAZAPI_ADMIN_URL.replace(/\/$/, "") + "/instance/status"
      const resp = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          token,
        },
        cache: "no-store",
      })
      let data: any = null
      try {
        data = await resp.json()
      } catch {
        data = await resp.text()
      }
      let rawStatus = ""
      let lastDisconnectReason = ""
      if (data && typeof data === "object") {
        rawStatus = data.status || data.connectionStatus || data.state || ""
        lastDisconnectReason = String(data.lastDisconnectReason || data.last_reason || "").trim()
      }
      const n = normalize(rawStatus)
      const status =
        n === "connected" ? "connected" :
        n === "open" ? "connected" :
        n === "connecting" ? "connecting" :
        (n === "close" || n === "closed" || n === "disconnected") ? "disconnected" :
        rawStatus || "unknown"
      return NextResponse.json({ ok: resp.ok, status, lastDisconnectReason, body: data })
    } catch (e: any) {
      return NextResponse.json({ ok: false, message: e?.message || "status_error" }, { status: 200 })
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || "unexpected_error" }, { status: 200 })
  }
}
