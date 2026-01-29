import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const instance = String(body.instance || "")
    const number = String(body.number || "")
    const text = String(body.text || "")
    const delay = typeof body.delay === "number" ? body.delay : 0
    const linkPreview = body.linkPreview === undefined ? true : !!body.linkPreview
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
