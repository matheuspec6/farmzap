import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const instance = String(body.instance || "")
    const number = String(body.number || "")
    const text = String(body.text || "")
    const provider = String(body.provider || "evolution")
    const delay = typeof body.delay === "number" ? body.delay : 0
    const linkPreview = body.linkPreview === undefined ? true : !!body.linkPreview
    const type = String(body.type || "")
    const choices = Array.isArray(body.choices) ? body.choices : []
    const footerText = body.footerText === undefined ? "" : String(body.footerText || "")
    const imageButton = body.imageButton ? String(body.imageButton) : undefined

    if (provider === "uazapi") {
      const uazapiUrl = process.env.UAZAPI_URL || "https://free.uazapi.com"
      const uazapiToken = process.env.UAZAPI_TOKEN || ""
      
      if (!uazapiUrl || !uazapiToken) {
        return NextResponse.json({ ok: false, error: "missing_uazapi_config" }, { status: 200 })
      }

      const isMenu = type === "button" || choices.length > 0
      const endpoint = isMenu ? `${uazapiUrl}/send/menu` : `${uazapiUrl}/send/text`
      const payload = isMenu
        ? {
            number,
            type: "button",
            text,
            choices,
            footerText,
            imageButton
          }
        : { number, text }

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "token": uazapiToken
        },
        body: JSON.stringify(payload)
      })

      let data: any = null
      try {
        data = await resp.json()
      } catch {
        data = await resp.text()
      }
      return NextResponse.json({ ok: resp.ok, status: resp.status, body: data })
    }

    const baseUrl = process.env.EVOLUTION_API_URL || ""
    const key = process.env.EVOLUTION_API_KEY || ""
    if (!baseUrl || !key) {
      return NextResponse.json({ ok: false, error: "missing_evolution_config" }, { status: 200 })
    }
    const url = `${baseUrl}/message/sendText/${instance}`
    const resp = await fetch(url, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ number, text, delay, linkPreview }),
    })
    const data = await resp.text()
    return NextResponse.json({ ok: resp.ok, status: resp.status, body: data.slice(0, 1000) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 })
  }
}
