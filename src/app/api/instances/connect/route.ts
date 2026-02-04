import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const UAZAPI_ADMIN_URL = process.env.UAZAPI_ADMIN_URL || process.env.UAZAPI_URL
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN

function normalize(s: any) {
  return (s ?? "").toString().toLowerCase().trim()
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
    const name = String(body?.name || "").trim()
    const phone = body?.phone ? String(body.phone).replace(/\D/g, "") : ""

    if (!name) {
      return NextResponse.json({ ok: false, message: "missing_instance_name" }, { status: 200 })
    }

    if (provider !== "uazapi" || !UAZAPI_ADMIN_URL) {
      return NextResponse.json({ ok: false, message: "unsupported_provider" }, { status: 200 })
    }

    let token = ""
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `uazapi_token_${name}`)
        .maybeSingle()
      if (data?.value) token = String(data.value).trim()
    } catch {}

    if (!token && UAZAPI_ADMIN_TOKEN) {
      try {
        const url = UAZAPI_ADMIN_URL.replace(/\/$/, "") + "/instance/all"
        const resp = await fetch(url, {
          headers: { Accept: "application/json", admintoken: UAZAPI_ADMIN_TOKEN },
          cache: "no-store",
        })
        if (resp.ok) {
          const list = await resp.json()
          if (Array.isArray(list)) {
            const found = list.find((i: any) => normalize(i?.name) === normalize(name))
            if (found?.token) token = String(found.token).trim()
          }
        }
      } catch {}
    }

    if (!token) {
      return NextResponse.json({ ok: false, message: "missing_instance_token" }, { status: 200 })
    }

    try {
      const endpoint = UAZAPI_ADMIN_URL.replace(/\/$/, "") + "/instance/connect"
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          token,
        },
        body: JSON.stringify({ phone: phone || "" }),
      })
      let data: any = null
      try {
        data = await resp.json()
      } catch {
        data = await resp.text()
      }
      const pickString = (v: any): string => (typeof v === "string" ? v : "")
      const ensurePngDataUri = (v: string): string => {
        const s = String(v || "").trim()
        if (!s) return ""
        if (s.startsWith("data:image/png;base64,")) return s
        const base64Like = /^[A-Za-z0-9+/=]+$/.test(s) && s.length > 100
        return base64Like ? `data:image/png;base64,${s}` : ""
      }
      const deep = (obj: any, keys: string[]): string => {
        if (!obj || typeof obj !== "object") return ""
        for (const k of keys) {
          if (typeof obj[k] === "string" && obj[k]) return obj[k]
        }
        for (const v of Object.values(obj)) {
          if (typeof v === "object" && v) {
            const found = deep(v, keys)
            if (found) return found
          }
        }
        return ""
      }
      let qrcode = ""
      let pairingCode = ""
      if (typeof data === "string") {
        qrcode = ensurePngDataUri(data)
        const s = String(data).trim()
        const isCode = /^[A-Z0-9-]{4,}$/.test(s)
        if (isCode) pairingCode = s
      } else if (data && typeof data === "object") {
        const qrRaw = deep(data, ["qrcode", "qrCode", "qr", "image", "base64"])
        qrcode = ensurePngDataUri(qrRaw)
        const codeRaw = deep(data, ["pairingCode", "paircode", "code", "pin"])
        pairingCode = pickString(codeRaw)
      }
      if (resp.ok && UAZAPI_ADMIN_TOKEN) {
        try {
          const upd = await fetch(UAZAPI_ADMIN_URL.replace(/\/$/, "") + "/instance/update", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              admintoken: UAZAPI_ADMIN_TOKEN,
            },
            body: JSON.stringify({ token, status: "connecting" }),
          })
          await upd.text().catch(() => {})
        } catch {}
      }
      const isQrCode = !phone
      const isPairingCode = !!phone
      const timeout = isQrCode ? 120 : 300
      return NextResponse.json({
        ok: resp.ok,
        status: resp.status,
        body: data,
        payload: { qrcode, pairingCode },
        isQrCode,
        isPairingCode,
        timeout
      })
    } catch (e: any) {
      return NextResponse.json({ ok: false, message: e?.message || "connect_error" }, { status: 200 })
    }
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || "unexpected_error" }, { status: 200 })
  }
}
