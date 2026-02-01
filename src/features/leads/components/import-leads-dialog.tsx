"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Upload, FileSpreadsheet, AlertCircle, X, HelpCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Tag {
  id: string
  name: string
  color: string
}

interface ImportLeadsDialogProps {
  onImport?: (leads: any[]) => void
  children?: React.ReactNode
  tags?: Tag[]
}

export function ImportLeadsDialog({ onImport, children, tags = [] }: ImportLeadsDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string>("")
  
  const [headers, setHeaders] = useState<string[]>([])
  const [fileData, setFileData] = useState<any[]>([])
  const [mapping, setMapping] = useState({
    name: "",
    phone: "",
  })

  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (selectedFile: File) => {
    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv" // .csv
    ]
    // Check extension as fallback because mime types can be tricky
    const validExtensions = [".xlsx", ".xls", ".csv"]
    const extension = "." + selectedFile.name.split(".").pop()?.toLowerCase()

    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(extension)) {
      setError("Formato de arquivo inválido. Por favor envie .xlsx, .xls ou .csv")
      return
    }

    setFile(selectedFile)
    setError(null)
    readFile(selectedFile)
  }

  const readFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        
        if (jsonData.length === 0) {
          setError("O arquivo está vazio.")
          setFile(null)
          return
        }

        // Get headers from the first row keys
        const firstRow = jsonData[0] as any
        const extractedHeaders = Object.keys(firstRow)
        setHeaders(extractedHeaders)
        setFileData(jsonData)

        // Auto-mapping
        const newMapping = { name: "", phone: "" }
        extractedHeaders.forEach(header => {
            const h = header.toLowerCase()
            if (h.includes("nome") || h.includes("name")) newMapping.name = header
            if (h.includes("tele") || h.includes("fone") || h.includes("cel") || h.includes("phone")) newMapping.phone = header
        })
        setMapping(newMapping)

      } catch (err) {
        console.error(err)
        setError("Erro ao processar o arquivo.")
        setFile(null)
      }
    }
    reader.readAsBinaryString(file)
  }

  const reset = () => {
    setFile(null)
    setFileData([])
    setHeaders([])
    setMapping({ name: "", phone: "" })
    setError(null)
  }

  const handleConfirm = () => {
    if (!mapping.name || !mapping.phone) {
        setError("Por favor mapeie as colunas de Nome e Telefone.")
        return
    }
    
    setIsLoading(true)
    
    // Helper to clean phone
    const cleanPhone = (phone: any) => {
        let cleaned = String(phone || "").replace(/\D/g, '')
        if (!cleaned.startsWith('55') && (cleaned.length === 10 || cleaned.length === 11)) {
            cleaned = '55' + cleaned
        }
        return cleaned
    }

    // Transform data based on mapping
    const processedData = fileData.map((row, index) => ({
        id: `imported-${index}`,
        name: row[mapping.name],
        phone: cleanPhone(row[mapping.phone]),
        original: row,
        tags: selectedTagId ? [selectedTagId] : []
    }))

    // Simulate delay
    setTimeout(() => {
        setIsLoading(false)
        setOpen(false)
        if (onImport) onImport(processedData)
        reset()
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
             <Button>
               <Upload className="mr-2 h-4 w-4" /> Importar Leads
             </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Leads</DialogTitle>
          <DialogDescription>
            Arraste sua planilha ou clique para selecionar. Formatos aceitos: .xlsx, .csv
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Drop Zone */}
          {!file ? (
             <div 
               className={cn(
                 "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                 dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50",
                 error && "border-destructive/50 bg-destructive/5"
               )}
               onDragEnter={handleDrag}
               onDragLeave={handleDrag}
               onDragOver={handleDrag}
               onDrop={handleDrop}
               onClick={() => inputRef.current?.click()}
             >
                <input 
                    ref={inputRef}
                    type="file" 
                    className="hidden" 
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleChange}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-4 rounded-full bg-muted">
                        <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Clique para selecionar ou arraste o arquivo aqui</p>
                        <p className="text-xs text-muted-foreground">XLSX ou CSV (Max 5MB)</p>
                    </div>
                </div>
                {error && <p className="text-sm text-destructive mt-4">{error}</p>}
             </div>
          ) : (
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • {fileData.length} linhas</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={reset}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Column Mapping */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                             <h3 className="font-medium text-sm">Mapeamento de Colunas</h3>
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Selecione as colunas correspondentes na sua planilha.</p>
                                    </TooltipContent>
                                </Tooltip>
                             </TooltipProvider>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label>Nome do Contato <span className="text-destructive">*</span></Label>
                                <select 
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={mapping.name}
                                    onChange={(e) => setMapping(prev => ({ ...prev, name: e.target.value }))}
                                >
                                    <option value="">Selecione a coluna...</option>
                                    {headers.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>Telefone / WhatsApp <span className="text-destructive">*</span></Label>
                                <select 
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={mapping.phone}
                                    onChange={(e) => setMapping(prev => ({ ...prev, phone: e.target.value }))}
                                >
                                    <option value="">Selecione a coluna...</option>
                                    {headers.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>

                            {tags && tags.length > 0 && (
                                <div className="space-y-1 pt-2 border-t">
                                    <Label>Etiqueta (Opcional)</Label>
                                    <select 
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={selectedTagId}
                                        onChange={(e) => setSelectedTagId(e.target.value)}
                                    >
                                        <option value="">Sem etiqueta</option>
                                        {tags.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Todos os contatos importados receberão esta etiqueta.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                     <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 text-sm text-primary">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <HelpCircle className="h-4 w-4" />
                            Importante
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Certifique-se de que os números de telefone incluam o código do país (ex: 55) e DDD.</li>
                            <li>Colunas não mapeadas serão importadas como variáveis extras.</li>
                            <li>Você poderá usar essas variáveis para personalizar suas mensagens (ex: {"{Cidade}"}).</li>
                        </ul>
                    </div>
                </div>

                {/* Preview */}
                <div className="space-y-4">
                        <h3 className="font-medium text-sm">Pré-visualização (5 primeiras linhas)</h3>
                        <div className="rounded-md border overflow-hidden max-w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    {headers.map((header) => {
                                        let badge = null
                                        if (header === mapping.name) {
                                            badge = <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">Nome</span>
                                        } else if (header === mapping.phone) {
                                            badge = <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">Telefone</span>
                                        } else {
                                            badge = <span className="ml-2 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">Var</span>
                                        }
                                        return (
                                            <TableHead key={header} className="whitespace-nowrap min-w-[150px]">
                                                {header}
                                                {badge}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fileData.slice(0, 5).map((row, i) => (
                                    <TableRow key={i}>
                                        {headers.map((header) => (
                                            <TableCell key={`${i}-${header}`} className="whitespace-nowrap">
                                                {row[header]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            Mostrando 5 de {fileData.length} registros
                        </p>
                </div>
                
                {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}
            </div>
          )}
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button 
                onClick={handleConfirm} 
                disabled={!file || isLoading || !mapping.name || !mapping.phone}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
                {isLoading ? "Importando..." : "Confirmar Importação"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
