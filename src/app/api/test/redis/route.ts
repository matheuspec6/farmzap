import { NextResponse } from "next/server"
import Redis from "ioredis"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const host = String(body.host || "")
    const port = Number(body.port || 6379)
    const password = body.password ? String(body.password) : undefined
    const db = body.db !== undefined ? Number(body.db) : undefined
    const client = new Redis({ host, port, password, db })
    const pong = await client.ping()
    client.disconnect()
    return NextResponse.json({ ok: pong === "PONG", host, port })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 })
  }
}

