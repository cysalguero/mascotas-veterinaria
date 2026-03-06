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
    Calendar as CalendarIcon,
    User,
    Edit
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { PatientEditor } from '@/components/patients/patient-editor'
import { VetesoftPatient } from '@/actions/vetesoft'
import { PatientAvatar } from '@/components/patients/patient-avatar'

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
    patient_name?: string
    patient_data?: any
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
    const [selectedDay, setSelectedDay] = useState<Date | null>(null)
    const [isDayModalOpen, setIsDayModalOpen] = useState(false)

    // Editor State
    const [editorInvoiceId, setEditorInvoiceId] = useState<string | null>(null)
    const [editorInitialPatients, setEditorInitialPatients] = useState<VetesoftPatient[]>([])
    const [isEditorOpen, setIsEditorOpen] = useState(false)

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
            .gte('fecha_contable', format(start, 'yyyy-MM-dd'))
            .lte('fecha_contable', format(end, 'yyyy-MM-dd'))

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
        return invoices.filter(inv => isSameDay(parseISO(inv.fecha_contable || inv.fecha_venta), day))
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
                                    onClick={() => {
                                        setSelectedDay(day)
                                        setIsDayModalOpen(true)
                                    }}
                                    className={`p-2 border-r border-b border-border transition-all flex flex-col gap-1 min-h-[120px] cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!isCurrentMonth ? 'bg-zinc-50/30 dark:bg-zinc-900/10' : ''
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
                                            <div className="flex flex-col items-end text-right">
                                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 leading-none mb-0.5">
                                                    Q{dayInvoices.reduce((acc, inv) => acc + (inv.total_q || 0), 0).toLocaleString('es-GT', { maximumFractionDigits: 0 })}
                                                </span>
                                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter opacity-60 leading-none">
                                                    {dayInvoices.length} {dayInvoices.length === 1 ? 'Fact' : 'Facts'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[120px] scrollbar-hide">
                                        {dayInvoices.map(inv => (
                                            <button
                                                key={inv.id}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedInvoice(inv)
                                                    setIsDrawerOpen(true)
                                                }}
                                                className={`group text-left p-2 rounded-xl border text-[10px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm flex flex-col gap-0.5 ${inv.fecha_contable && (new Date(inv.fecha_venta + 'T12:00:00').getMonth() !== new Date(inv.fecha_contable + 'T12:00:00').getMonth() || new Date(inv.fecha_venta + 'T12:00:00').getFullYear() !== new Date(inv.fecha_contable + 'T12:00:00').getFullYear())
                                                    ? 'bg-purple-50/80 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-300'
                                                    : isPaid(inv)
                                                        ? 'bg-blue-50/50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-300'
                                                        : 'bg-orange-50/50 border-orange-100 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-1 w-full">
                                                    <span className="font-mono font-bold truncate opacity-80 flex items-center gap-1">
                                                        #{inv.ticket_numero}
                                                        {inv.fecha_contable && (new Date(inv.fecha_venta + 'T12:00:00').getMonth() !== new Date(inv.fecha_contable + 'T12:00:00').getMonth() || new Date(inv.fecha_venta + 'T12:00:00').getFullYear() !== new Date(inv.fecha_contable + 'T12:00:00').getFullYear()) && (
                                                            <CalendarClock size={10} className="text-purple-600" />
                                                        )}
                                                    </span>
                                                    <span className="font-black whitespace-nowrap">Q{inv.total_q.toFixed(0)}</span>
                                                </div>
                                                {inv.patient_name && (
                                                    <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-medium truncate w-full">
                                                        {inv.patient_data && (
                                                            <PatientAvatar
                                                                id_animal={Array.isArray(inv.patient_data) ? inv.patient_data[0].id_animal : inv.patient_data.id_animal}
                                                                especie={Array.isArray(inv.patient_data) ? inv.patient_data[0].especie : inv.patient_data.especie}
                                                                size="xs"
                                                                className="h-3 w-3 shadow-none border-none"
                                                            />
                                                        )}
                                                        <span className="truncate">{inv.patient_name}</span>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Footer Monthly Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6">
                <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Registros</span>
                    <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{invoices.length}</span>
                        <span className="text-xs font-bold text-zinc-400 mb-1.5">facturas</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Procesos Base</span>
                    <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                            {invoices.reduce((acc, inv) => acc + (inv.invoice_items?.reduce((iAcc, item) => iAcc + (item.comisionable ? (item.cantidad || 0) : 0), 0) || 0), 0)}
                        </span>
                        <span className="text-xs font-bold text-zinc-400 mb-1.5">servicios</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Facturado</span>
                    <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                            Q {invoices.reduce((acc, inv) => acc + (inv.total_q || 0), 0).toLocaleString('es-GT', { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Total Comisionable</span>
                    <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                            Q {invoices.reduce((acc, inv) => acc + (inv.invoice_items?.reduce((iAcc, item) => iAcc + (item.comisionable ? (item.total_q || 0) : 0), 0) || 0), 0).toLocaleString('es-GT', { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Day Details Modal */}
            <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter">
                            {selectedDay && format(selectedDay, 'PPPP', { locale: es })}
                        </DialogTitle>
                        <DialogDescription className="font-medium text-zinc-500">
                            Resumen de actividad y facturas registradas.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDay && (
                        <div className="space-y-6 mt-4">
                            {/* Daily Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Facturado Hoy</p>
                                    <p className="text-2xl font-black text-blue-600">
                                        Q {getInvoicesForDay(selectedDay).reduce((acc, inv) => acc + inv.total_q, 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Registros</p>
                                    <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                                        {getInvoicesForDay(selectedDay).length}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {/* Invoices List */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400">Detalle de Facturas</h4>
                                {getInvoicesForDay(selectedDay).length === 0 ? (
                                    <div className="py-8 text-center text-zinc-400 italic font-medium bg-zinc-50 dark:bg-zinc-900/50 rounded-xl">
                                        No hay movimientos registrados en este día.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {getInvoicesForDay(selectedDay).map((inv) => {
                                            const isDifferentDate = inv.fecha_contable && (new Date(inv.fecha_venta + 'T12:00:00').getMonth() !== new Date(inv.fecha_contable + 'T12:00:00').getMonth() || new Date(inv.fecha_venta + 'T12:00:00').getFullYear() !== new Date(inv.fecha_contable + 'T12:00:00').getFullYear());
                                            const statusColorClasses = isDifferentDate
                                                ? 'bg-purple-50/50 border-purple-200 hover:border-purple-400 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800'
                                                : isPaid(inv)
                                                    ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800'
                                                    : 'bg-orange-50/50 border-orange-200 hover:border-orange-400 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800';

                                            const iconBgClasses = isDifferentDate
                                                ? 'bg-purple-100 text-purple-600'
                                                : isPaid(inv)
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-orange-100 text-orange-600';

                                            return (
                                                <div
                                                    key={inv.id}
                                                    onClick={() => {
                                                        setSelectedInvoice(inv)
                                                        setIsDrawerOpen(true)
                                                    }}
                                                    className={`group flex items-center justify-between p-4 border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer ${statusColorClasses}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-lg ${iconBgClasses}`}>
                                                            {isDifferentDate ? <CalendarClock size={18} /> : <Tag size={18} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold">Ticket #{inv.ticket_numero}</p>
                                                            <p className="text-xs opacity-70 font-medium">{inv.invoice_items?.length || 0} items • {inv.forma_pago}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black">Q {inv.total_q.toFixed(2)}</p>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                                                            {isDifferentDate ? 'Contabilidad Diferida' : isPaid(inv) ? 'Pagado' : 'Pendiente'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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
                                        {format(new Date(selectedInvoice.fecha_venta + 'T12:00:00'), 'PPPP', { locale: es })}
                                    </SheetDescription>

                                    {selectedInvoice.fecha_contable && (new Date(selectedInvoice.fecha_venta + 'T12:00:00').getMonth() !== new Date(selectedInvoice.fecha_contable + 'T12:00:00').getMonth() || new Date(selectedInvoice.fecha_venta + 'T12:00:00').getFullYear() !== new Date(selectedInvoice.fecha_contable + 'T12:00:00').getFullYear()) && (
                                        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-xl flex items-start gap-3">
                                            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                                                <CalendarClock size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">Nota Contable</h4>
                                                <p className="text-xs text-purple-600/80 dark:text-purple-400 font-medium leading-relaxed mt-1">
                                                    Este registro tiene una fecha contable diferente a su fecha de emisión. Pertenece al cierre de <span className="font-black underline">{format(new Date(selectedInvoice.fecha_contable + 'T12:00:00'), 'MMMM yyyy', { locale: es })}</span>.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-6 flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-4">
                                            {selectedInvoice.patient_data && (
                                                <PatientAvatar
                                                    id_animal={Array.isArray(selectedInvoice.patient_data) ? selectedInvoice.patient_data[0].id_animal : selectedInvoice.patient_data.id_animal}
                                                    especie={Array.isArray(selectedInvoice.patient_data) ? selectedInvoice.patient_data[0].especie : selectedInvoice.patient_data.especie}
                                                    size="md"
                                                    className="rounded-lg shadow-sm border-white dark:border-zinc-800"
                                                />
                                            )}
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pacientes Vinculados</p>
                                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                    {selectedInvoice.patient_name || 'Sin vincular'}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs font-bold uppercase tracking-widest"
                                            onClick={() => {
                                                setEditorInvoiceId(selectedInvoice.id)

                                                const pData = selectedInvoice.patient_data
                                                const pList = Array.isArray(pData) ? pData : (pData ? [pData] : [])

                                                setEditorInitialPatients(pList)
                                                setIsEditorOpen(true)
                                            }}
                                        >
                                            <Edit className="h-3 w-3 mr-2" /> Editar
                                        </Button>
                                    </div>
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
            {/* Patient Editor */}
            {editorInvoiceId && (
                <PatientEditor
                    isOpen={isEditorOpen}
                    onOpenChange={setIsEditorOpen}
                    invoiceId={editorInvoiceId}
                    initialPatients={editorInitialPatients}
                    onSuccess={() => {
                        fetchMonthInvoices()
                        // Update selected invoice reference if needed
                        setInvoices(prev => {
                            const updated = prev.map(inv => {
                                if (inv.id === editorInvoiceId) {
                                    // We can't easily guess the new name without refetching or passing it out
                                    // The fetchMonthInvoices call above will handle the refresh asynchronously
                                    return inv
                                }
                                return inv
                            })
                            return updated
                        })
                        // Close drawer to refresh data cleanly or just let it stay open? 
                        // Better to keep drawer open but we need to update 'selectedInvoice' too.
                        // For now let's close drawer to avoid stale data issues or fetch specific invoice.
                        setIsDrawerOpen(false)
                    }}
                />
            )}
        </div>
    )
}
