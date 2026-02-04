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
    const batch = Math.max(1, limit)
    const types = ["waiting", "delayed", "active", "paused"] as const
    const jobsToRemove: any[] = []
    let start = 0
    while (true) {
      const jobs = await queue.getJobs(types as any, start, start + batch - 1)
      if (!jobs.length) break
      for (const j of jobs) {
        const data: any = j.data || {}
        if (data.campaignId === campaignId) {
          jobsToRemove.push(j)
        }
      }
      start += batch
    }
    let removed = 0
    for (const j of jobsToRemove) {
      try {
        await j.remove()
        removed++
      } catch {}
    }
    return NextResponse.json({ removed, matched: jobsToRemove.length }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
