"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DEFAULT_PROMPT =
  "Não altere o sentido, a intenção ou o contexto da mensagem original. O texto deve permanecer sempre em português, ser claro, fácil de entender e manter um tom profissional. As alterações precisam ser realmente perceptíveis, evitando mudanças mínimas. Mantenha o texto organizado e respeite as quebras de linha existentes."

export default function ConfiguracoesPage() {
  const [prompt, setPrompt] = React.useState<string>(DEFAULT_PROMPT)
  const [editingPrompt, setEditingPrompt] = React.useState<boolean>(false)
  
  const [defaultProvider, setDefaultProvider] = React.useState<string>("evolution")
  const [editingProvider, setEditingProvider] = React.useState<boolean>(false)

  const [saving, setSaving] = React.useState<boolean>(false)
  const [loaded, setLoaded] = React.useState<boolean>(false)

  React.useEffect(() => {
    const load = async () => {
      // Load AI Prompt
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "ai_prompt")
          .maybeSingle()
        if (!error && data && typeof data.value === "string" && data.value.trim()) {
          setPrompt(data.value)
        } else {
            // Fallback to local storage if not in DB
             const raw = localStorage.getItem("aiPrompt")
             const val = raw ? JSON.parse(raw) : null
             if (typeof val === "string" && val.trim()) {
               setPrompt(val)
             }
        }
      } catch {}

      // Load Default Provider
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "default_provider")
          .maybeSingle()
        if (!error && data && typeof data.value === "string" && data.value.trim()) {
          setDefaultProvider(data.value)
        }
      } catch {}

      setLoaded(true)
    }
    load()
  }, [])

  const savePrompt = async () => {
    setSaving(true)
    try {
      await supabase
        .from("app_settings")
        .upsert({ key: "ai_prompt", value: prompt, updated_at: new Date().toISOString() }, { onConflict: "key" })
    } catch {}
    try {
      localStorage.setItem("aiPrompt", JSON.stringify(prompt))
    } catch {}
    setEditingPrompt(false)
    setSaving(false)
  }

  const saveProvider = async () => {
    setSaving(true)
    try {
        await supabase
          .from("app_settings")
          .upsert({ key: "default_provider", value: defaultProvider, updated_at: new Date().toISOString() }, { onConflict: "key" })
      } catch {}
    setEditingProvider(false)
    setSaving(false)
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Canais de Envio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Defina qual canal de envio será utilizado prioritariamente para disparos de mensagens.
          </p>
          <div className="space-y-2">
            <Label htmlFor="provider">Provedor Padrão</Label>
            <Select 
                value={defaultProvider} 
                onValueChange={setDefaultProvider}
                disabled={!editingProvider}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evolution">Evolution API</SelectItem>
                <SelectItem value="uazapi">Uazapi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {!editingProvider ? (
              <Button onClick={() => setEditingProvider(true)}>Editar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditingProvider(false)}>Cancelar</Button>
                <Button onClick={saveProvider} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mesclar mensagem com IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Quando a opção Mesclar mensagem com IA estiver ativada na criação de envios, este texto será usado como
            orientação para gerar variações da mensagem base.
          </p>
          <div className="space-y-2">
            <Label htmlFor="prompt">Mensagem padrão</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="h-[160px] resize-y"
              disabled={!editingPrompt}
            />
          </div>
          <div className="flex gap-2">
            {!editingPrompt ? (
              <Button onClick={() => setEditingPrompt(true)}>Editar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditingPrompt(false)}>Cancelar</Button>
                <Button onClick={savePrompt} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
