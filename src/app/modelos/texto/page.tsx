"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Save, Send } from "lucide-react"
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
  const [testPhone, setTestPhone] = React.useState("")
  const [sendingTest, setSendingTest] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    const loadTemplate = async () => {
      if (id) {
        try {
          const template = await templateService.getTemplateById(id)
          if (template) {
            setName(template.name)
            setCategory(template.category)
            setContent(template.content || "")
          }
        } catch (error) {
          console.error(error)
          toast.error("Erro ao carregar modelo")
        }
      }
    }
    loadTemplate()
  }, [id])

  const handleTestSend = async () => {
    if (!content) {
        alert("Preencha o conteúdo da mensagem")
        return
    }
    if (!testPhone) {
        alert("Preencha o telefone para teste")
        return
    }

    setSendingTest(true)
    try {
        // Buscar qualquer instância conectada
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

        // Enviar mensagem via proxy interno para evitar problemas de CORS e autenticação
        const sendRes = await fetch("/api/test/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                instance: connected.name,
                number: testPhone.replace(/\D/g, ""),
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
        if (id) {
            // Edit existing
            await templateService.updateTemplate(id, {
                name,
                category,
                content
            })
            toast.success("Modelo atualizado com sucesso")
        } else {
            // Create new
            await templateService.createTemplate({
                name,
                category,
                content
            })
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
                        <Label>Conteúdo</Label>
                        <Textarea 
                            placeholder="Digite sua mensagem aqui..." 
                            className="min-h-[200px]"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Formatação disponível: *negrito*, _itálico_, ~tachado~, ```monoespaçado```
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Button className="w-full" onClick={handleSave} disabled={isLoading}>
                {isLoading ? <span className="animate-spin mr-2">⏳</span> : <Save className="mr-2 h-4 w-4" />} 
                {isLoading ? "Salvando..." : "Salvar Modelo"}
            </Button>
        </div>

        <div className="space-y-6">
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
                
                <div className="w-full max-w-[350px] bg-white rounded-lg shadow-sm p-2 relative z-10 mt-10 mb-24">
                    <div 
                        className="p-2 text-sm text-gray-800 whitespace-pre-wrap break-words"
                        dangerouslySetInnerHTML={{ __html: formatWhatsApp(content) }}
                    />
                    <div className="flex justify-end mt-1 px-2 pb-1">
                        <span className="text-[10px] text-gray-400">17:38</span>
                    </div>
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
