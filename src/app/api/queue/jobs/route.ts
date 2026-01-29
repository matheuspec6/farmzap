import { NextResponse } from "next/server"
import { getQueue } from "@/server/queue"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const campaignId = url.searchParams.get("campaignId") || undefined
    const status = url.searchParams.get("status") || undefined
    const limit = Number(url.searchParams.get("limit") || 50)
    const queue = getQueue()
    const types = status ? [status] as any : ["waiting", "delayed", "active", "completed", "failed"]
    const jobs = await queue.getJobs(types, 0, limit)
    const filtered = campaignId ? jobs.filter(j => (j.data as any)?.campaignId === campaignId) : jobs
    const compact = filtered.map(j => ({
      id: j.id,
      name: j.name,
      timestamp: j.timestamp,
      finishedOn: j.finishedOn,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      data: j.data,
      returnValue: j.returnvalue,
      status: j.finishedOn ? "completed" : j.failedReason ? "failed" : j.processedOn ? "active" : "waiting",
    }))
    return NextResponse.json({ jobs: compact })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

