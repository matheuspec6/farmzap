import { NextResponse } from "next/server"
import { getQueue } from "@/server/queue"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const campaignId = url.searchParams.get("campaignId") || undefined
    const limit = Number(url.searchParams.get("limit") || 100)
    const queue = getQueue()
    const counts = await queue.getJobCounts("waiting", "delayed", "active", "completed", "failed")
    let byCampaign: any = null
    if (campaignId) {
      const statuses = ["waiting", "delayed", "active", "completed", "failed"] as const
      const totals: Record<string, number> = {}
      for (const s of statuses) {
        const jobs = await queue.getJobs([s], 0, limit)
        totals[s] = jobs.filter(j => (j.data as any)?.campaignId === campaignId).length
      }
      byCampaign = { campaignId, totals }
    }
    return NextResponse.json({ counts, byCampaign })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

