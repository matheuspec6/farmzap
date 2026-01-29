import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const DEFAULT_PROMPT =
  "Não altere o sentido, a intenção ou o contexto da mensagem original. O texto deve permanecer sempre em português, ser claro, fácil de entender e manter um tom profissional. As alterações precisam ser realmente perceptíveis, evitando mudanças mínimas. Mantenha o texto organizado e respeite as quebras de linha existentes."

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return NextResponse.json({ messages: [] }, { status: 200 })
  }
  try {
    const body = await request.json()
    const base: string = body.base || ""
    const count: number = Math.max(1, Math.min(50, Number(body.count) || 1))
    let systemPrompt = DEFAULT_PROMPT
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ai_prompt")
        .maybeSingle()
      if (!error && data && typeof data.value === "string" && data.value.trim()) {
        systemPrompt = data.value
      }
    } catch {}
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Crie ${count} variações da mensagem base: "${base}". Retorne um JSON array de strings, sem comentários.` },
        ],
      }),
    })
    if (!resp.ok) {
      return NextResponse.json({ messages: [] }, { status: 200 })
    }
    const data = await resp.json()
    const raw = data?.choices?.[0]?.message?.content || ""
    let cleaned = String(raw || "").trim()
    cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim()
    let arr: any = null
    try {
      const match = cleaned.match(/\[[\s\S]*\]/)
      const candidate = match ? match[0] : cleaned
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed)) {
        arr = parsed
      }
    } catch {}
    let messages: string[] = Array.isArray(arr)
      ? arr.map((s: any) => String(s).replace(/^["']|["']$/g, "").trim())
      : cleaned
          .split("\n")
          .map(s => s.trim())
          .filter(s => !!s && !/^json$/i.test(s) && !s.startsWith("[") && !s.startsWith("]"))
    if (!messages.length) messages = [base]
    if (messages.length < count) {
      messages = [...messages, ...Array(count - messages.length).fill(base)]
    }
    messages = messages.slice(0, count)
    return NextResponse.json({ messages }, { status: 200 })
  } catch {
    return NextResponse.json({ messages: [] }, { status: 200 })
  }
}
