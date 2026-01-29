import { NextResponse } from "next/server"
import Redis from "ioredis"

export async function GET() {
  try {
    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379"
    const probe = new Redis(url)
    const pong = await probe.ping()
    probe.disconnect()
    return NextResponse.json({ ok: pong === "PONG", url })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 })
  }
}

