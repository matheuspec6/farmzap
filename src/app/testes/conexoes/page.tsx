"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TesteConexoesPage() {
  const [supabaseStatus, setSupabaseStatus] = React.useState<null | { ok: boolean; message: string }>(null)
  const [redisPingStatus, setRedisPingStatus] = React.useState<null | { ok: boolean; message: string }>(null)
  const [evolutionStatus, setEvolutionStatus] = React.useState<null | { ok: boolean; message: string }>(null)
  const [chatgptStatus, setChatgptStatus] = React.useState<null | { ok: boolean; message: string }>(null)

  const [host, setHost] = React.useState("n8n.tinked.com.br")
  const [port, setPort] = React.useState("6379")
  const [password, setPassword] = React.useState("")
  const [db, setDb] = React.useState("0")
  const [redisStatus, setRedisStatus] = React.useState<null | { ok: boolean; message: string }>(null)

  const [instance, setInstance] = React.useState("")
  const [number, setNumber] = React.useState("")
  const [text, setText] = React.useState("teste de envio")
  const [sendStatus, setSendStatus] = React.useState<null | { ok: boolean; message: string }>(null)

  React.useEffect(() => {
    const checkAll = async () => {
      try {
        const { data, error } = await supabase.from("app_settings").select("key").limit(1)
        setSupabaseStatus({ ok: !error, message: !error ? "Supabase OK" : (error.message || "Erro") })
      } catch (e: any) {
        setSupabaseStatus({ ok: false, message: e?.message || "Erro" })
      }
      try {
        const res = await fetch("/api/queue/ping", { cache: "no-store" })
        const json = await res.json()
        setRedisPingStatus({ ok: !!json.ok, message: json.ok ? "Redis OK" : (json.error || "Falha") })
      } catch (e: any) {
        setRedisPingStatus({ ok: false, message: e?.message || "Falha" })
      }
      try {
        const res = await fetch("/api/instances", { cache: "no-store" })
        const json = await res.json()
        const count = Array.isArray(json.instances) ? json.instances.length : 0
        setEvolutionStatus({ ok: count > 0, message: count > 0 ? `${count} instância(s) aberta(s)` : "Nenhuma instância aberta" })
      } catch (e: any) {
        setEvolutionStatus({ ok: false, message: e?.message || "Falha" })
      }
      try {
        const res = await fetch("/api/ai/variations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base: "teste", count: 1 }),
        })
        const json = await res.json()
        const ok = Array.isArray(json.messages) && json.messages.length > 0
        setChatgptStatus({ ok, message: ok ? "ChatGPT OK" : "Chave ausente ou erro" })
      } catch (e: any) {
        setChatgptStatus({ ok: false, message: e?.message || "Falha" })
      }
    }
    checkAll()
  }, [])

  const testRedis = async () => {
    setRedisStatus(null)
    const payload = {
      host,
      port: Number(port),
      password: password || undefined,
      db: Number(db),
    }
    console.log("Teste Redis - request:", payload)
    try {
      const res = await fetch("/api/test/redis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      console.log("Teste Redis - response:", json)
      if (!json.ok) {
        console.error("Teste Redis - erro:", json.error)
      }
      setRedisStatus({ ok: !!json.ok, message: json.ok ? `Conexão OK (${json.host}:${json.port})` : (json.error || "Falha") })
    } catch (e: any) {
      console.error("Teste Redis - network error:", e?.message || e)
      setRedisStatus({ ok: false, message: e?.message || "Falha" })
    }
  }

  const testSend = async () => {
    setSendStatus(null)
    const payload = { instance, number, text }
    console.log("Teste Envio - request:", payload)
    try {
      const res = await fetch("/api/test/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      console.log("Teste Envio - response:", json)
      if (!json.ok) {
        console.error("Teste Envio - erro:", json.error)
      }
      setSendStatus({ ok: !!json.ok, message: json.ok ? `Status ${json.status}` : (json.error || "Falha") })
    } catch (e: any) {
      console.error("Teste Envio - network error:", e?.message || e)
      setSendStatus({ ok: false, message: e?.message || "Falha" })
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Teste de Conexões</h2>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">Supabase</span>
              <span className={`h-3 w-3 rounded-full ${supabaseStatus === null ? "bg-gray-400" : supabaseStatus.ok ? "bg-emerald-500" : "bg-red-500"}`} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">Redis</span>
              <span className={`h-3 w-3 rounded-full ${redisPingStatus === null ? "bg-gray-400" : redisPingStatus.ok ? "bg-emerald-500" : "bg-red-500"}`} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">Evolution</span>
              <span className={`h-3 w-3 rounded-full ${evolutionStatus === null ? "bg-gray-400" : evolutionStatus.ok ? "bg-emerald-500" : "bg-red-500"}`} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">ChatGPT</span>
              <span className={`h-3 w-3 rounded-full ${chatgptStatus === null ? "bg-gray-400" : chatgptStatus.ok ? "bg-emerald-500" : "bg-red-500"}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Redis</h3>
            {redisStatus && (
              <Badge variant={redisStatus.ok ? "default" : "destructive"}>
                {redisStatus.message}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Host</Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="n8n.tinked.com.br" />
            </div>
            <div className="space-y-2">
              <Label>Porta</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="6379" />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Database</Label>
              <Input value={db} onChange={(e) => setDb(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={testRedis}>Testar Conexão</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Envio de Mensagem (Evolution)</h3>
            {sendStatus && (
              <Badge variant={sendStatus.ok ? "default" : "destructive"}>
                {sendStatus.message}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Instância</Label>
              <Input value={instance} onChange={(e) => setInstance(e.target.value)} placeholder="ex: instance-001" />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="5511999999999" />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Input value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={testSend}>Enviar Mensagem de Teste</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
