import { NextResponse } from 'next/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function GET() {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return NextResponse.json({ instances: [] }, { status: 200 })
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Evolution API error:', response.status, response.statusText)
      return NextResponse.json({ instances: [] }, { status: 200 })
    }

    const data = await response.json()
    console.log('Evolution API data:', data)

    if (!data) {
        return NextResponse.json({ instances: [] }, { status: 200 })
    }

    const items = Array.isArray(data) ? data : (data.instances || [])

    const normalize = (s: any) =>
      (s ?? '').toString().toLowerCase().trim()

    const instances = items
      .map((it: any) => it.instance || it)
      .filter((inst: any) => {
        const raw = inst.connectionStatus ?? inst.status ?? ''
        const n = normalize(raw)
        return n === 'open'
      })
      .map((inst: any) => ({
        id: inst.instanceId || inst.id,
        key: inst.instanceName || inst.id || inst.name,
        name: inst.name,
        profileName: inst.profileName || inst.instanceName || inst.name,
        status: inst.connectionStatus ?? inst.status ?? 'unknown',
      }))

    return NextResponse.json({ instances })
  } catch (error) {
    console.error('API Instances Error:', error)
    return NextResponse.json({ instances: [] }, { status: 200 })
  }
}
