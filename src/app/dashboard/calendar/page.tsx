'use client'

import { useState, useEffect, Fragment } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    eachDayOfInterval,
    parseISO,
    setMonth,
    setYear,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Tag,
    ExternalLink,
    CheckCircle,
    XCircle,
    CalendarClock,
    Calendar as CalendarIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface Invoice {
    id: string
    ticket_numero: number
    fecha_venta: string
    fecha_contable?: string
    forma_pago: string
    total_q: number
    pagado_q: number
    observaciones_doctora: string
    file_url: string
    invoice_items?: any[]
}

interface Category {
    id: string
    name: string
}

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i)

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        fetchMonthInvoices()
        fetchCategories()
    }, [currentDate])

    async function fetchCategories() {
        const { data } = await supabase.from('categories').select('id, name')
        if (data) setCategories(data)
    }

    async function fetchMonthInvoices() {
        setIsLoading(true)
        const start = startOfMonth(currentDate)
        const end = endOfMonth(currentDate)

        const { data, error } = await supabase
            .from('invoices')
            .select('*, invoice_items(*)')
            .gte('fecha_venta', format(start, 'yyyy-MM-dd'))
            .lte('fecha_venta', format(end, 'yyyy-MM-dd'))

        if (!error && data) {
            setInvoices(data)
        }
        setIsLoading(false)
    }

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    const handleMonthChange = (monthIdx: number) => {
        setCurrentDate(setMonth(currentDate, monthIdx))
    }

    const handleYearChange = (year: number) => {
        setCurrentDate(setYear(currentDate, year))
    }

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const getInvoicesForDay = (day: Date) => {
        return invoices.filter(inv => isSameDay(parseISO(inv.fecha_venta), day))
    }

    const isPaid = (inv: Invoice) => {
        return (inv.pagado_q || 0) >= inv.total_q
    }

    const getCategoryName = (id: string) => {
        return categories.find(c => c.id === id)?.name || 'General'
    }

    return (
        <div className="space-y-6 max-w-full overflow-hidden">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-zinc-950 p-4 md:p-6 rounded-2xl border border-border shadow-sm gap-4">
                <div className="flex flex-col items-center md:items-start space-y-2 w-full md:w-auto">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <select
                                className="text-xl md:text-2xl font-black bg-transparent border-none focus:ring-0 cursor-pointer appearance-none pr-8 relative z-10"
                                value={currentDate.getMonth()}
                                onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={m} value={i} className="text-base font-medium">{m}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none group-hover:text-zinc-600 transition-colors" />
                        </div>
                        <div className="relative group">
                            <select
                                className="text-xl md:text-2xl font-black text-zinc-400 bg-transparent border-none focus:ring-0 cursor-pointer appearance-none pr-8 relative z-10"
                                value={currentDate.getFullYear()}
                                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                            >
                                {YEARS.map(y => (
                                    <option key={y} value={y} className="text-base font-medium">{y}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300 pointer-events-none group-hover:text-zinc-500 transition-colors" />
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest hidden md:block">
                        Historial de Facturación
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-zinc-100/50 dark:bg-zinc-900/50 p-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 font-black text-[10px] uppercase tracking-widest h-8 rounded-full shadow-sm"
                    >
                        Hoy
                    </Button>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid Container */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-border overflow-hidden shadow-xl overflow-x-auto">
                <div className="min-w-[700px]">
                    {/* Days of Week */}
                    <div className="grid grid-cols-7 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                            <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
                        {calendarDays.map((day, i) => {
                            const dayInvoices = getInvoicesForDay(day)
                            const isCurrentMonth = isSameMonth(day, monthStart)
                            const isToday = isSameDay(day, new Date())

                            return (
                                <div
                                    key={i}
                                    className={`p-2 border-r border-b border-border transition-colors flex flex-col gap-1 min-h-[120px] ${!isCurrentMonth ? 'bg-zinc-50/30 dark:bg-zinc-900/10' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[11px] font-black w-7 h-7 flex items-center justify-center rounded-full transition-all ${isToday
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none scale-110'
                                            : isCurrentMonth ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-300 dark:text-zinc-700'
                                            }`}>
                                            {format(day, 'd')}
                                        </span>
                                        {dayInvoices.length > 0 && (
                                            <span className="text-[9px] font-black text-zinc-400 px-1.5 py-0.5 rounded-full uppercase tracking-tighter opacity-60">
                                                {dayInvoices.length} {dayInvoices.length === 1 ? 'Fact' : 'Facts'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[120px] scrollbar-hide">
                                        {dayInvoices.map(inv => (
                                            <button
                                                key={inv.id}
                                                onClick={() => {
                                                    setSelectedInvoice(inv)
                                                    setIsDrawerOpen(true)
                                                }}
                                                className={`group text-left p-2 rounded-xl border text-[10px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm flex flex-col gap-0.5 ${inv.fecha_contable && (new Date(inv.fecha_venta).getMonth() !== new Date(inv.fecha_contable).getMonth() || new Date(inv.fecha_venta).getFullYear() !== new Date(inv.fecha_contable).getFullYear())
                                                    ? 'bg-purple-50/80 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-300'
                                                    : isPaid(inv)
                                                        ? 'bg-blue-50/50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300'
                                                        : 'bg-orange-50/50 border-orange-100 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-1 w-full">
                                                    <span className="font-mono font-bold truncate opacity-80 flex items-center gap-1">
                                                        #{inv.ticket_numero}
                                                        {inv.fecha_contable && (new Date(inv.fecha_venta).getMonth() !== new Date(inv.fecha_contable).getMonth() || new Date(inv.fecha_venta).getFullYear() !== new Date(inv.fecha_contable).getFullYear()) && (
                                                            <CalendarClock size={10} className="text-purple-600" />
                                                        )}
                                                    </span>
                                                    <span className="font-black whitespace-nowrap">Q{inv.total_q.toFixed(0)}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Sidebar Details Drawer */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-lg w-full md:w-[600px] overflow-y-auto p-0 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl">
                    {selectedInvoice && (
                        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
                            {/* Drawer Header */}
                            <div className="p-8 pb-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <Badge variant={isPaid(selectedInvoice) ? "secondary" : "outline"} className={`px-3 py-1 text-[10px] font-black tracking-widest ${isPaid(selectedInvoice)
                                        ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-sm"
                                        : "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 shadow-sm"
                                        }`}>
                                        {isPaid(selectedInvoice) ? 'TOTALMENTE CANCELADO' : 'PENDIENTE / PARCIAL'}
                                    </Badge>
                                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-md">ID: {selectedInvoice.id.slice(0, 8)}</span>
                                </div>

                                <div className="space-y-1">
                                    <SheetTitle className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
                                        Ticket #{selectedInvoice.ticket_numero}
                                    </SheetTitle>
                                    <SheetDescription className="text-sm text-zinc-500 font-semibold tracking-wide">
                                        {format(parseISO(selectedInvoice.fecha_venta), 'PPPP', { locale: es })}
                                    </SheetDescription>

                                    {selectedInvoice.fecha_contable && (new Date(selectedInvoice.fecha_venta).getMonth() !== new Date(selectedInvoice.fecha_contable).getMonth() || new Date(selectedInvoice.fecha_venta).getFullYear() !== new Date(selectedInvoice.fecha_contable).getFullYear()) && (
                                        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-xl flex items-start gap-3">
                                            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                                                <CalendarClock size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">Nota Contable</h4>
                                                <p className="text-xs text-purple-600/80 dark:text-purple-400 font-medium leading-relaxed mt-1">
                                                    Este registro tiene una fecha contable diferente a su fecha de emisión. Pertenece al cierre de <span className="font-black underline">{format(parseISO(selectedInvoice.fecha_contable), 'MMMM yyyy', { locale: es })}</span>.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Drawer Body content with margins */}
                            <div className="p-8 space-y-8 flex-grow">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2 shadow-sm">
                                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Método de Pago</span>
                                        <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                                            {selectedInvoice.forma_pago || 'No especificado'}
                                        </p>
                                    </div>
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-2 shadow-sm">
                                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Total Facturado</span>
                                        <p className="text-3xl font-black text-blue-600">Q{selectedInvoice.total_q.toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                        <Tag size={14} /> Detalle de Productos
                                    </h4>
                                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-lg">
                                        <Table>
                                            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                                                <TableRow>
                                                    <TableHead className="text-[11px] font-black uppercase tracking-wider text-zinc-400 py-4 px-6">Descripción / Categoría</TableHead>
                                                    <TableHead className="text-[11px] font-black uppercase tracking-wider text-zinc-400 text-center py-4 px-6 w-[80px]">Comisión</TableHead>
                                                    <TableHead className="text-[11px] font-black uppercase tracking-wider text-zinc-400 text-right py-4 px-6 w-[80px]">Cant.</TableHead>
                                                    <TableHead className="text-[11px] font-black uppercase tracking-wider text-zinc-400 text-right py-4 px-6 w-[120px]">Subtotal</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedInvoice.invoice_items?.map((item, idx) => (
                                                    <TableRow key={item.id || idx} className="hover:bg-zinc-50/30 transition-colors border-b last:border-0">
                                                        <TableCell className="py-4 px-6">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                                                    {item.descripcion}
                                                                </span>
                                                                <span className="inline-flex items-center text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                                                    <Tag size={10} className="mr-1" />
                                                                    {getCategoryName(item.categoria_id)}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center py-4 px-6">
                                                            {item.comisionable ? (
                                                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-red-500 mx-auto opacity-20" />
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm font-bold text-zinc-500 py-4 px-6">
                                                            {item.cantidad}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm font-black text-zinc-900 dark:text-zinc-100 py-4 px-6">
                                                            Q{item.total_q.toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Observaciones */}
                                {selectedInvoice.observaciones_doctora && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Observaciones</h4>
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 italic relative">
                                            <span className="absolute -top-3 left-4 bg-white dark:bg-zinc-950 px-2 text-zinc-300 text-2xl font-serif">“</span>
                                            {selectedInvoice.observaciones_doctora}
                                            <span className="absolute -bottom-6 right-4 text-zinc-300 text-2xl font-serif">”</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-8 pt-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800">
                                <Button
                                    className="w-full h-14 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 font-black uppercase tracking-widest text-xs shadow-xl rounded-2xl"
                                    onClick={() => window.open(selectedInvoice.file_url, '_blank')}
                                >
                                    <ExternalLink size={18} className="mr-3" /> Ver Comprobante Original
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
