import { NextResponse } from "next/server"
import { getQueue } from "@/server/queue"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const campaignId = String(body.campaignId || "")
    const limit = Number(body.limit || 1000)
    if (!campaignId) {
      return NextResponse.json({ removed: 0 }, { status: 200 })
    }
    const queue = getQueue()
    const jobs = await queue.getJobs(["waiting", "delayed"], 0, limit)
    let removed = 0
    for (const j of jobs) {
      const data: any = j.data || {}
      if (data.campaignId === campaignId) {
        try {
          await j.remove()
          removed++
        } catch {}
      }
    }
    return NextResponse.json({ removed }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
