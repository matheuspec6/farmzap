 "use client"
 
 import * as React from "react"
 import { Button } from "@/components/ui/button"
 import { Calendar } from "@/components/ui/calendar"
 import { Label } from "@/components/ui/label"
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from "@/components/ui/popover"
 import { addDays, format } from "date-fns"
 import { ptBR } from "date-fns/locale"
 import { CalendarIcon } from "lucide-react"
 import { type DateRange } from "react-day-picker"
 
 export function DatePickerWithRange(props?: { value?: DateRange; onChange?: (range: DateRange | undefined) => void }) {
 const [internal, setInternal] = React.useState<DateRange | undefined>(undefined)
  const date = props?.value ?? internal
  const handleSelect = (range: DateRange | undefined) => {
    if (!props?.value) setInternal(range)
    if (props?.onChange) props.onChange(range)
  }
 
 React.useEffect(() => {
   if (props?.value) return
   try {
     const raw = localStorage.getItem("dashboardRange")
     if (raw) {
       const parsed = JSON.parse(raw)
       const from = parsed?.from ? new Date(parsed.from) : undefined
       const to = parsed?.to ? new Date(parsed.to) : undefined
       if (from || to) {
         setInternal({ from, to })
         return
       }
     }
   } catch {}
   const now = new Date()
   const from = new Date()
   from.setDate(now.getDate() - 7)
   setInternal({ from, to: now })
 }, [props?.value])
 
   return (
    <div className="w-60">
       <Label htmlFor="date-picker-range" className="mb-2 block">
         Período
       </Label>
       <Popover>
         <PopoverTrigger asChild>
           <Button
             variant="outline"
             id="date-picker-range"
             className="justify-start px-2.5 font-normal"
           >
             <CalendarIcon className="mr-2 h-4 w-4" />
             {date?.from ? (
               date.to ? (
                 <span suppressHydrationWarning={true}>
                   {format(date.from, "dd 'de' LLLL 'de' yyyy", { locale: ptBR })} -{" "}
                   {format(date.to, "dd 'de' LLLL 'de' yyyy", { locale: ptBR })}
                 </span>
               ) : (
                 <span suppressHydrationWarning={true}>
                   {format(date.from, "dd 'de' LLLL 'de' yyyy", { locale: ptBR })}
                 </span>
               )
             ) : (
               <span>Selecione uma data</span>
             )}
           </Button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0" align="start">
           <Calendar
             mode="range"
             defaultMonth={date?.from}
             selected={date}
             onSelect={handleSelect}
             numberOfMonths={2}
             locale={ptBR}
           />
         </PopoverContent>
       </Popover>
     </div>
   )
 }
