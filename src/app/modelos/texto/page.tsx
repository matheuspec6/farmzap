"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Save, Send, Bold, Italic, Strikethrough, Code, Smile, ChevronDown, ImageIcon, VideoIcon, FileText, MapPin, Link, Phone, CornerUpLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Função para formatar o texto estilo WhatsApp
const formatWhatsApp = (text: string) => {
    if (!text) return "Sua mensagem aparecerá aqui..."

    // Escapar HTML para segurança
    let formatted = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

    // Placeholders para blocos de código (para evitar formatação interna)
    const codeBlocks: string[] = []
    formatted = formatted.replace(/```([\s\S]*?)```/g, (match, content) => {
        codeBlocks.push(content)
        return `__CODEBLOCK_${codeBlocks.length - 1}__`
    })

    const inlineCodes: string[] = []
    formatted = formatted.replace(/`([^`]+)`/g, (match, content) => {
        inlineCodes.push(content)
        return `__INLINECODE_${inlineCodes.length - 1}__`
    })

    // Formatação de blocos (Citação e Listas)
    // Citação
    formatted = formatted.replace(/^&gt; (.*)$/gm, '<div class="border-l-4 border-gray-300 pl-2 text-gray-500 italic my-1">$1</div>')
    
    // Lista com marcadores (* ou -)
    formatted = formatted.replace(/^[*|-] (.*)$/gm, '<div class="flex gap-2 ml-2"><span>•</span><span>$1</span></div>')
    
    // Lista enumerada (1. texto)
    formatted = formatted.replace(/^(\d+)\. (.*)$/gm, '<div class="flex gap-2 ml-2"><span>$1.</span><span>$2</span></div>')

    // Formatação inline
    // Negrito *texto*
    formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    
    // Itálico _texto_
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>')
    
    // Tachado ~texto~
    formatted = formatted.replace(/~([^~]+)~/g, '<del>$1</del>')

    // Restaurar inline codes
    formatted = formatted.replace(/__INLINECODE_(\d+)__/g, (match, index) => {
        return `<code class="bg-gray-100 px-1 rounded font-mono text-xs text-red-500">${inlineCodes[parseInt(index)]}</code>`
    })

    // Restaurar code blocks
    formatted = formatted.replace(/__CODEBLOCK_(\d+)__/g, (match, index) => {
        return `<pre class="bg-gray-100 p-2 rounded font-mono text-xs overflow-x-auto my-1 text-gray-700">${codeBlocks[parseInt(index)]}</pre>`
    })

    // Quebras de linha (apenas se não for bloco HTML que já tem display block)
    // Uma abordagem simples é usar white-space: pre-wrap no container, mas como injetamos divs, pode ficar estranho.
    // Vamos substituir \n por <br> apenas onde não houve formatação de bloco recente? 
    // Ou simplesmente confiar no browser.
    // Como estamos usando divs para linhas de lista/citação, o comportamento padrão de bloco já quebra linha.
    // Para linhas normais, precisamos de <br> se o container não tiver white-space: pre-wrap.
    // Se o container tiver white-space: pre-wrap, os divs vão quebrar linha + o \n do texto original vai quebrar de novo (duplo enter).
    // O ideal é remover os \n das linhas que viraram blocos.
    
    // Simplificação: vamos manter white-space-pre-wrap e tentar não quebrar o layout.
    // Mas divs dentro de pre-wrap causam quebra de linha visual + a quebra de linha do texto.
    
    return formatted
}

import { templateService } from "@/features/templates/services/template.service"
import { toast } from "sonner"

export default function NovoModeloTextoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id")

  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("Marketing")
  const [content, setContent] = React.useState("")
  const [footer, setFooter] = React.useState("")
  const [mediaSample, setMediaSample] = React.useState("none")
  type ButtonModel = {
    id: string
    type: "personalizado" | "action"
    label: string
    value?: string
    choices?: Array<{ label: string; value: string }>
    actionKind?: "site" | "whatsapp" | "call" | "flow" | "coupon"
  }
  const [buttons, setButtons] = React.useState<ButtonModel[]>([])
  const [imageButton, setImageButton] = React.useState("")
  const [imagePreviewError, setImagePreviewError] = React.useState(false)
  const [testPhone, setTestPhone] = React.useState("")
  const [sendingTest, setSendingTest] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const contentRef = React.useRef<HTMLTextAreaElement | null>(null)

  React.useEffect(() => {
    setImagePreviewError(false)
  }, [imageButton])

  React.useEffect(() => {
    const loadTemplate = async () => {
      if (id) {
        try {
          const template = await templateService.getTemplateById(id)
          if (template) {
            setName(template.name)
            setCategory(template.category)
            try {
              if (template.type === "menu") {
                const parsed = JSON.parse(template.content || "{}")
                const text = String(parsed.text || "")
                const footerText = parsed.footerText ? String(parsed.footerText) : ""
                const imgBtn = parsed.imageButton ? String(parsed.imageButton) : ""
                const choicesArr = Array.isArray(parsed.choices) ? parsed.choices : []
                const parsedChoices: Array<{ label: string; value: string }> = choicesArr
                  .map((s: any) => String(s))
                  .map((s: string) => {
                    const [label, ...rest] = s.split("|")
                    const value = rest.join("|")
                    return { label: label || "", value: value || "" }
                  })
                setContent(text)
                setFooter(footerText)
                setImageButton(imgBtn)
                setButtons(parsedChoices.map(pc => ({
                  id: crypto.randomUUID(),
                  type: "personalizado",
                  label: pc.label,
                  value: pc.value
                })))
              } else {
                setContent(template.content || "")
              }
            } catch {
              setContent(template.content || "")
            }
          }
        } catch (error) {
          console.error(error)
          toast.error("Erro ao carregar modelo")
        }
      }
    }
    loadTemplate()
  }, [id])

  const limitBody = 1024
  const limitFooter = 60
  const limitButtonLabel = 25
  const addButtonReply = () => {
    if (buttons.length >= 10) return
    setButtons(prev => [
      ...prev,
      { 
        id: crypto.randomUUID(), 
        type: "personalizado", 
        label: `Personalizado`,
        value: ""
      }
    ])
  }
  const addButtonAction = () => {
    if (buttons.length >= 10) return
    setButtons(prev => [...prev, { id: crypto.randomUUID(), type: "action", label: `Visit website`, value: "", actionKind: "site" }])
  }
  const removeButton = (id: string) => {
    setButtons(prev => prev.filter(b => b.id !== id))
  }
  const updateButton = (id: string, patch: Partial<ButtonModel>) => {
    setButtons(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)))
  }
  const addChoice = (id: string) => {
    setButtons(prev => prev.map(b => {
      if (b.id !== id) return b
      const choices = Array.isArray(b.choices) ? b.choices : []
      if (choices.length >= 10) return b
      return { ...b, choices: [...choices, { label: "", value: "" }] }
    }))
  }
  const removeChoice = (id: string, index: number) => {
    setButtons(prev => prev.map(b => {
      if (b.id !== id) return b
      const choices = Array.isArray(b.choices) ? b.choices.slice() : []
      choices.splice(index, 1)
      return { ...b, choices }
    }))
  }
  const updateChoice = (id: string, index: number, patch: Partial<{ label: string; value: string }>) => {
    setButtons(prev => prev.map(b => {
      if (b.id !== id) return b
      const choices = Array.isArray(b.choices) ? b.choices.slice() : []
      if (!choices[index]) return b
      choices[index] = { ...choices[index], ...patch }
      return { ...b, choices }
    }))
  }
  const insertAroundSelection = (prefix: string, suffix?: string) => {
    const ta = contentRef.current
    if (!ta) {
      setContent(prev => `${prev}${prefix}${suffix ?? prefix}`)
      return
    }
    const start = ta.selectionStart ?? ta.value.length
    const end = ta.selectionEnd ?? ta.value.length
    const before = ta.value.slice(0, start)
    const sel = ta.value.slice(start, end)
    const after = ta.value.slice(end)
    const sfx = suffix ?? prefix
    const next = `${before}${prefix}${sel}${sfx}${after}`
    setContent(next.slice(0, limitBody))
    setTimeout(() => {
      ta.focus()
      const pos = start + prefix.length + sel.length + sfx.length
      ta.setSelectionRange(pos, pos)
    }, 0)
  }
  const insertVariable = (key: string) => {
    const token = `{${key}}`
    const ta = contentRef.current
    if (!ta) {
      setContent(prev => `${prev}${token}`.slice(0, limitBody))
      return
    }
    const start = ta.selectionStart ?? ta.value.length
    const end = ta.selectionEnd ?? ta.value.length
    const before = ta.value.slice(0, start)
    const after = ta.value.slice(end)
    const next = `${before}${token}${after}`
    setContent(next.slice(0, limitBody))
    setTimeout(() => {
      ta.focus()
      const pos = start + token.length
      ta.setSelectionRange(pos, pos)
    }, 0)
  }

  const handleTestSend = async () => {
    if (!content) {
      alert("Preencha o conteúdo da mensagem")
      return
    }
    if (!testPhone) {
      alert("Preencha o telefone para teste")
      return
    }

    const normalizedPhone = testPhone.replace(/\D/g, "")
    const allChoices: string[] = []
    for (const b of buttons) {
      if (b.type === "personalizado") {
        const label = String(b.label || "").trim()
        if (label && allChoices.length < 10) {
          allChoices.push(label)
        }
      } else if (b.type === "action") {
        const label = String(b.label || "").trim()
        const value = String(b.value || "").trim()
        if (label && value && allChoices.length < 10) {
          allChoices.push(`${label}|${value}`)
        }
      }
    }

    const wantsMenu = allChoices.length > 0
    setSendingTest(true)
    try {
      if (wantsMenu) {
        const sendRes = await fetch("/api/test/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "uazapi",
            number: normalizedPhone,
            text: content,
            type: "button",
            choices: allChoices,
            footerText: footer,
            imageButton: imageButton || undefined
          })
        })
        const sendData = await sendRes.json()
        if (sendData.ok) {
          alert("Mensagem de teste enviada com sucesso!")
        } else {
          console.error("Erro envio teste:", sendData)
          alert(`Erro ao enviar mensagem de teste: ${sendData.error || "Erro desconhecido"}`)
        }
      } else {
        const res = await fetch("/api/instances", { cache: "no-store" })
        if (!res.ok) {
          console.error("Erro ao buscar instâncias:", res.status, res.statusText)
          alert("Erro ao conectar com o servidor para buscar instâncias.")
          setSendingTest(false)
          return
        }
        const json = await res.json()
        const instances = Array.isArray(json.instances) ? json.instances : []
        const connected = instances.find((i: any) => i.status === "open" || i.connectionStatus === "open")
        if (!connected) {
          alert("Nenhuma instância conectada encontrada para enviar o teste. Verifique se há uma conexão ativa.")
          setSendingTest(false)
          return
        }
        const sendRes = await fetch("/api/test/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instance: connected.name,
            number: normalizedPhone,
            text: content,
            delay: 1200
          })
        })
        const sendData = await sendRes.json()
        if (sendData.ok) {
          alert("Mensagem de teste enviada com sucesso!")
        } else {
          console.error("Erro envio teste:", sendData)
          alert(`Erro ao enviar mensagem de teste: ${sendData.error || "Erro desconhecido"}`)
        }
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao enviar mensagem de teste")
    } finally {
      setSendingTest(false)
    }
  }

  const handleSave = async () => {
    if (!name || !content) {
        toast.error("Preencha o nome e o conteúdo")
        return
    }

    try {
        setIsLoading(true)
        const menuChoices: string[] = []
        for (const b of buttons) {
          if (b.type === "personalizado") {
            const label = String(b.label || "").trim()
            if (label && menuChoices.length < 10) {
              menuChoices.push(label)
            }
          } else if (b.type === "action") {
            const label = String(b.label || "").trim()
            const value = String(b.value || "").trim()
            if (label && value && menuChoices.length < 10) {
              menuChoices.push(`${label}|${value}`)
            }
          }
        }
        const hasMenu = menuChoices.length > 0
        const payload = {
          name,
          category,
          content: hasMenu ? JSON.stringify({ text: content, choices: menuChoices, footerText: footer, imageButton: imageButton || undefined }) : content,
          type: hasMenu ? "menu" : "text"
        }
        if (id) {
            // Edit existing
            await templateService.updateTemplate(id, payload)
            toast.success("Modelo atualizado com sucesso")
        } else {
            // Create new
            await templateService.createTemplate(payload)
            toast.success("Modelo criado com sucesso")
        }
        router.push("/modelos")
    } catch (error) {
        console.error(error)
        toast.error("Erro ao salvar modelo")
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">
            {id ? "Editar modelo de texto" : "Novo modelo de texto"}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configurações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nome do modelo</Label>
                        <Input 
                            placeholder="Ex: marketing_envio_02" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Use um nome único para identificar este modelo.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                    <SelectItem value="Utilidade">Utilidade</SelectItem>
                                    <SelectItem value="Autenticação">Autenticação</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

              <div className="space-y-2">
                <Label>Amostra de mídia</Label>
                <Select value={mediaSample} onValueChange={setMediaSample}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="document">Documento</SelectItem>
                    <SelectItem value="location">Localização</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Corpo</Label>
                  <span className="text-xs text-muted-foreground">{content.length}/{limitBody}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="icon" onClick={() => insertAroundSelection("*")}>
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => insertAroundSelection("_")}>
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => insertAroundSelection("~")}>
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => insertAroundSelection("`")}>
                    <Code className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="sm">Adicionar variável</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => insertVariable("nome")}>nome</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => insertVariable("telefone")}>telefone</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => insertVariable("whatsapp")}>whatsapp</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Textarea 
                  placeholder="Digite sua mensagem aqui..." 
                  className="min-h-[200px]"
                  value={content}
                  onChange={e => setContent(e.target.value.slice(0, limitBody))}
                  ref={contentRef}
                />
                <p className="text-xs text-muted-foreground">
                  Formatação disponível: *negrito*, _itálico_, ~tachado~, ```monoespaçado```
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Rodapé</Label>
                  <span className="text-xs text-muted-foreground">{footer.length}/{limitFooter}</span>
                </div>
                <Input 
                  placeholder="Inserir texto" 
                  value={footer}
                  onChange={e => setFooter(e.target.value.slice(0, limitFooter))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Botões</Label>
                  <span className="text-xs text-muted-foreground">Opcional</span>
                </div>
                <p className="text-xs text-muted-foreground">Crie botões que permitam respostas ou ações. Até 10 botões. Se adicionar mais de 3, eles aparecem em lista.</p>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <span className="mr-2">Adicionar botão</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={addButtonReply}>Personalizado</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-xs text-muted-foreground">{buttons.length}/10</span>
                </div>
                <div className="space-y-2">
                  <Label>Imagem com botão</Label>
                  <Input 
                    className="h-8 w-full"
                    placeholder="https://exemplo.com/produto1.jpg"
                    value={imageButton}
                    onChange={e => setImageButton(e.target.value)}
                  />
                </div>

                {buttons.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {buttons.map(b => (
                      <div key={b.id} className="space-y-1">
                        <div className="text-xs text-muted-foreground">Resposta rápida • Opcional</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start border rounded-md px-3 py-3 bg-muted/20">
                          <div className="md:col-span-1">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={b.type} onValueChange={(v) => setButtons(prev => prev.map(x => x.id === b.id ? { ...x, type: v as any } : x))}>
                              <SelectTrigger className="h-8 w-full md:w-44">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="personalizado">Personalizado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2 flex items-end gap-3">
                            <div className="flex-1">
                              <Label className="text-xs">Texto do botão</Label>
                              <Input 
                                className="h-8 w-full"
                                value={b.label}
                                onChange={e => updateButton(b.id, { label: e.target.value.slice(0, limitButtonLabel) })}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{(b.label || "").length}/{limitButtonLabel}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remover" onClick={() => removeButton(b.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </CardContent>
            </Card>

            <Button className="w-full" onClick={handleSave} disabled={isLoading}>
                {isLoading ? <span className="animate-spin mr-2">⏳</span> : <Save className="mr-2 h-4 w-4" />} 
                {isLoading ? "Salvando..." : "Salvar Modelo"}
            </Button>
        </div>

        <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Prévia do modelo</h3>
            </div>
            <Card 
                className="min-h-[500px] flex flex-col items-center p-8 relative overflow-hidden"
                style={{
                    backgroundColor: "#E5DDD5",
                    backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                    backgroundRepeat: "repeat",
                    backgroundSize: "400px"
                }}
            >
                <div className="absolute inset-0 bg-black/5"></div>
                
                {mediaSample !== "none" && (
                  <div className="w-full max-w-[350px] bg-white rounded-lg shadow-sm p-3 relative z-10 mt-6">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      {mediaSample === "image" && <ImageIcon className="h-4 w-4" />}
                      {mediaSample === "video" && <VideoIcon className="h-4 w-4" />}
                      {mediaSample === "document" && <FileText className="h-4 w-4" />}
                      {mediaSample === "location" && <MapPin className="h-4 w-4" />}
                      <span className="font-medium capitalize">{mediaSample}</span>
                    </div>
                  </div>
                )}

                <div className="w-full max-w-[350px] bg-white rounded-lg shadow-sm p-2 relative z-10 mt-10 mb-24">
                    {imageButton && !imagePreviewError && /^https?:\/\//.test(imageButton) && (
                      <div className="px-2 pt-2">
                        <img
                          src={imageButton}
                          alt="Imagem do botão"
                          className="w-full rounded-md max-h-[220px] object-cover"
                          onError={() => setImagePreviewError(true)}
                        />
                      </div>
                    )}
                    <div 
                        className="p-2 text-sm text-gray-800 whitespace-pre-wrap break-words"
                        dangerouslySetInnerHTML={{ __html: formatWhatsApp(content) }}
                    />
                    <div className="flex justify-end mt-1 px-2 pb-1">
                        <span className="text-[10px] text-gray-400">17:38</span>
                    </div>
                    {buttons.length > 0 && (
                      <div className="mt-1 px-2">
                        <div className="flex flex-col gap-1">
                          {buttons.map(b => {
                            const choices = Array.isArray(b.choices) ? b.choices : []
                            if (b.type === "personalizado" && choices.length > 0) {
                              return choices.map((c, idx) => (
                                <div key={`${b.id}-${idx}`} className="flex items-center gap-1">
                                  <CornerUpLeft className="h-3 w-3 text-sky-600" />
                                  <span className="text-xs text-sky-600">{c.label || "(opção)"}</span>
                                </div>
                              ))
                            }
                            return (
                              <div key={b.id} className="flex items-center gap-1">
                                <CornerUpLeft className="h-3 w-3 text-sky-600" />
                                <span className="text-xs text-sky-600">{b.label}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {footer && (
                      <div className="px-2 pb-1 mt-1">
                        <span className="text-[10px] text-gray-500">{footer}</span>
                      </div>
                    )}
                </div>

                <div className="absolute bottom-8 w-full max-w-[350px] z-20 px-4">
                    <div className="flex gap-2 bg-white p-2 rounded-lg shadow-lg">
                        <Input 
                            placeholder="5511999999999" 
                            className="h-9"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleTestSend()
                                }
                            }}
                        />
                        <Button size="sm" onClick={handleTestSend} disabled={sendingTest}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
      </div>
    </div>
  )
}
