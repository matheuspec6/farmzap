 "use client"
import * as React from "react"
import { InstancesList } from "@/features/instances/components/instances-list"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export const dynamic = 'force-dynamic'

export default function InstanciasPage() {
  const [instances, setInstances] = React.useState<any[]>([])
  const [openCreate, setOpenCreate] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [titleReady, setTitleReady] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [openConnect, setOpenConnect] = React.useState(false)
  const [selected, setSelected] = React.useState<any | null>(null)
  const [phone, setPhone] = React.useState("")
  const [connecting, setConnecting] = React.useState(false)
  const [remaining, setRemaining] = React.useState(0)
  const [statusText, setStatusText] = React.useState<string>("")
  const [qrSrc, setQrSrc] = React.useState<string>("")
  const [pairingCode, setPairingCode] = React.useState<string>("")
  const [loadingMode, setLoadingMode] = React.useState<"" | "qr" | "pairing">("")
  const [phoneError, setPhoneError] = React.useState<string>("")
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  const load = React.useCallback(async () => {
    if (!titleReady) return
    setIsLoading(true)
    try {
      const url = title ? `/api/instances?title=${encodeURIComponent(title)}` : `/api/instances`
      const res = await fetch(url, { cache: "no-store" })
      if (res.ok) {
        const json = await res.json()
        const list = Array.isArray(json.instances) ? json.instances : []
        setInstances(list)
      } else {
        setInstances([])
      }
    } catch {
      setInstances([])
    }
    setIsLoading(false)
  }, [title, titleReady])

  React.useEffect(() => {
    try {
      const el = document.querySelector("span.text-base.font-semibold")
      const txt = el ? String(el.textContent || "").trim() : ""
      if (txt) {
        setTitle(txt)
        if (!newName) setNewName(txt)
      }
    } catch {}
    setTitleReady(true)
  }, [newName])

  React.useEffect(() => {
    load()
  }, [load])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const payload = { name: newName.trim(), adminField01: title || undefined }
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (json?.ok) {
        setOpenCreate(false)
        setNewName("")
        await load()
        setTimeout(() => {
          const byName = (instances || []).find((i) => {
            const nm = String(i?.name || i?.instanceName || "").trim()
            return nm && nm.toLowerCase() === newName.trim().toLowerCase()
          })
          if (byName) openConnectDialog(byName)
        }, 300)
      }
    } catch {}
    setCreating(false)
  }

  const openConnectDialog = (inst: any) => {
    setSelected(inst)
    setPhone("")
    setStatusText("")
    setRemaining(0)
    setQrSrc("")
    setPairingCode("")
    setLoadingMode("")
    setPhoneError("")
    setOpenConnect(true)
  }

  const stopTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current as any)
      timerRef.current = null
    }
  }

  const pollStatus = (name: string, totalSec: number) => {
    stopTimers()
    setRemaining(totalSec)
    timerRef.current = setInterval(async () => {
      setRemaining((prev) => {
        const next = prev - 1
        return next >= 0 ? next : 0
      })
      try {
        const r = await fetch(`/api/instances/status?name=${encodeURIComponent(name)}`, { cache: "no-store" })
        const j = await r.json().catch(() => ({}))
        const st = String(j?.status || "").toLowerCase()
        const reason = String(j?.lastDisconnectReason || j?.body?.lastDisconnectReason || "").toLowerCase()
        if (j?.status) {
          console.log("Status da instância:", j.status, "Motivo desconexão:", j?.lastDisconnectReason || "")
        }
        if (st === "connected") {
          stopTimers()
          setConnecting(false)
           setOpenConnect(false)
           setLoadingMode("")
           setQrSrc("")
           setPairingCode("")
          await load()
        } else if (st === "disconnected" && reason.includes("qr code timeout")) {
          // QR expirou — habilita botões e limpa QR atual
          stopTimers()
          setConnecting(false)
          setLoadingMode("")
          setQrSrc("")
          setPairingCode("")
          console.log("QR Code timeout")
        }
      } catch {}
    }, 1000)
  }

  const handleConnect = async (mode: "qr" | "pairing") => {
    if (!selected) return
    const name = selected?.name || selected?.instanceName || ""
    const digits = mode === "pairing" ? String(phone || "").replace(/\D/g, "") : ""
    if (mode === "pairing" && !digits) {
      setPhoneError("Informe o telefone para gerar o código de pareamento")
      return
    }
    setConnecting(true)
    setStatusText("")
    setQrSrc("")
    setPairingCode("")
    setLoadingMode(mode)
    setPhoneError("")
    try {
      const res = await fetch("/api/instances/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: digits }),
      })
      const j = await res.json().catch(() => ({}))
      const body = j?.body
      const payload = j?.payload
      const pickString = (v: any): string => (typeof v === "string" ? v : "")
      const ensurePngDataUri = (v: string): string => {
        const s = String(v || "").trim()
        if (!s) return ""
        if (s.startsWith("data:image/png;base64,")) return s
        // se vier apenas base64, prefixa
        const base64Like = /^[A-Za-z0-9+/=]+$/.test(s) && s.length > 100
        return base64Like ? `data:image/png;base64,${s}` : ""
      }
      if (payload && typeof payload === "object") {
        const qr = ensurePngDataUri(pickString(payload.qrcode))
        const code = pickString(payload.pairingCode)
        if (qr) setQrSrc(qr)
        if (code) setPairingCode(code)
      }
      // tenta extrair QR do corpo
      let qr = ""
      if (typeof body === "string") {
        qr = ensurePngDataUri(body)
      } else if (body && typeof body === "object") {
        const deep = (obj: any, keys: string[]): string => {
          if (!obj || typeof obj !== "object") return ""
          for (const k of keys) {
            if (typeof obj[k] === "string" && obj[k]) return obj[k]
          }
          for (const v of Object.values(obj)) {
            if (typeof v === "object" && v) {
              const found = deep(v, keys)
              if (found) return found
            }
          }
          return ""
        }
        const qrRaw =
          pickString(body.qrcode) ||
          pickString(body.qrCode) ||
          pickString(body.image) ||
          pickString(body.base64) ||
          deep(body, ["qrcode", "qrCode", "qr", "image", "base64"])
        qr = ensurePngDataUri(qrRaw)
      }
      setQrSrc(qr)
      // tenta extrair código de pareamento
      let code = ""
      if (body && typeof body === "object") {
        const deep = (obj: any, keys: string[]): string => {
          if (!obj || typeof obj !== "object") return ""
          for (const k of keys) {
            if (typeof obj[k] === "string" && obj[k]) return obj[k]
          }
          for (const v of Object.values(obj)) {
            if (typeof v === "object" && v) {
              const found = deep(v, keys)
              if (found) return found
            }
          }
          return ""
        }
        code =
          pickString(body.pairingCode) ||
          pickString(body.paircode) ||
          pickString(body.code) ||
          pickString(body.pin) ||
          deep(body, ["pairingCode", "paircode", "code", "pin"]) ||
          ""
      } else if (typeof body === "string") {
        const s = String(body).trim()
        const isCode = /^[A-Z0-9-]{4,}$/.test(s)
        code = isCode ? s : ""
      }
      setPairingCode(code)
      setLoadingMode("")
      const t = Number(j?.timeout || (mode === "qr" ? 120 : 300))
      pollStatus(name, t)
    } catch {
      setLoadingMode("")
      setConnecting(false)
    }
  }

  const handleDisconnect = async (inst: any) => {
    try {
      const name = inst?.name || inst?.instanceName || ""
      const resp = await fetch("/api/instances/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      await resp.json().catch(() => ({}))
      await load()
    } catch {}
  }

  const handleDelete = async (inst: any) => {
    try {
      const name = inst?.name || inst?.instanceName || ""
      const resp = await fetch(`/api/instances/delete?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      })
      await resp.json().catch(() => ({}))
      await load()
    } catch {}
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Canais de Atendimento</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Canal
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
         <p className="text-muted-foreground">
            Gerencie suas conexões com o WhatsApp.
         </p>
      </div>
      <InstancesList
        instances={instances}
        loading={isLoading}
        onConnect={openConnectDialog}
        onDisconnect={handleDisconnect}
        onDelete={handleDelete}
      />
      
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Canal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="instance-name">Nome da instância</Label>
              <Input
                id="instance-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: APROFEM"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openConnect} onOpenChange={(v) => { setOpenConnect(v); if (!v) { stopTimers(); setConnecting(false) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connect-phone">Telefone</Label>
              <Input
                id="connect-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 96123-4567"
              />
              <p className="text-xs text-muted-foreground">Opcional, serve para gerar código de pareamento</p>
              {!!phoneError && (
                <p className="text-xs text-destructive">{phoneError}</p>
              )}
            </div>
            {!connecting && (
              <div className="flex flex-col gap-2">
                <Button onClick={() => handleConnect("qr")}>
                  Gerar QR Code
                </Button>
                <Button onClick={() => handleConnect("pairing")} variant="secondary">
                  Gerar Código de Pareamento
                </Button>
              </div>
            )}
            {!!loadingMode && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {loadingMode === "qr" ? "Gerando QR Code..." : "Gerando código de pareamento..."}
              </div>
            )}
            {!!qrSrc && (
              <div className="rounded-md border p-3">
                <img src={qrSrc} alt="QR Code" className="mx-auto h-56 w-56 object-contain" />
              </div>
            )}
            {!!pairingCode && (
              <div className="rounded-md border p-3 flex items-center justify-between">
                <div className="text-sm">
                  Código de Pareamento:
                  <span className="ml-2 font-mono font-semibold">{pairingCode}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigator.clipboard && navigator.clipboard.writeText(pairingCode)}
                >
                  Copiar
                </Button>
              </div>
            )}
            {connecting && (
              <div className="text-sm text-muted-foreground">
                <div>Tempo restante: {remaining}s</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenConnect(false); stopTimers(); setConnecting(false) }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
