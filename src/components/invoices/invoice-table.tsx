'use client'

import { useState, useEffect, Fragment } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    MoreHorizontal,
    ChevronDown,
    ChevronUp,
    Search,
    Trash2,
    Tag,
    XCircle,
    CheckCircle,
    ExternalLink,
    CalendarClock
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Invoice {
    id: string
    ticket_numero: number
    fecha_venta: string
    fecha_contable?: string
    forma_pago: string
    total_q: number
    observaciones_doctora: string
    file_url: string
    doctor_id: string
    invoice_items?: InvoiceItem[]
}

interface InvoiceItem {
    id: string
    descripcion: string
    cantidad: number
    precio_unitario_q: number
    total_q: number
    comisionable: boolean
    categoria_id: string
}

interface Category {
    id: string
    name: string
}

export function InvoiceTable() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [dateFilterMode, setDateFilterMode] = useState<'single' | 'range'>('single')
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' })
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
    const [categories, setCategories] = useState<Category[]>([])
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchInvoices()
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        const { data: catData } = await supabase.from('categories').select('id, name').order('name')
        if (catData) setCategories(catData)
    }

    const fetchInvoices = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const { data, error: supabaseError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    invoice_items (*)
                `)
                .order('fecha_venta', { ascending: false })

            if (supabaseError) throw supabaseError
            setInvoices(data || [])
        } catch (err: any) {
            console.error('Error fetching invoices:', err)
            setError(err.message || 'No se pudieron cargar las facturas.')
        } finally {
            setIsLoading(false)
        }
    }

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    const deleteInvoice = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.')) return

        try {
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id)

            if (error) throw error
            setInvoices(prev => prev.filter(inv => inv.id !== id))
        } catch (error) {
            console.error('Error deleting invoice:', error)
            alert('Error al eliminar la factura.')
        }
    }

    const filteredInvoices = invoices.filter(inv => {
        const searchLower = search.toLowerCase()
        const matchesSearch = (
            inv.ticket_numero.toString().includes(searchLower) ||
            inv.observaciones_doctora?.toLowerCase().includes(searchLower) ||
            inv.invoice_items?.some(item => item.descripcion.toLowerCase().includes(searchLower))
        )

        const matchesCategory = selectedCategory === 'all' || inv.invoice_items?.some(item => item.categoria_id === selectedCategory)

        let matchesDate = true
        if (dateFilterMode === 'single' && dateRange.from) {
            matchesDate = inv.fecha_venta === dateRange.from
        } else if (dateFilterMode === 'range' && dateRange.from && dateRange.to) {
            const invDate = new Date(inv.fecha_venta).getTime()
            const fromDate = new Date(dateRange.from).getTime()
            const toDate = new Date(dateRange.to).getTime()
            matchesDate = invDate >= fromDate && invDate <= toDate
        }

        return matchesSearch && matchesCategory && matchesDate
    })

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
                <p className="text-zinc-500 animate-pulse font-medium">Cargando registros...</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Summary & Filters Bar */}
            <div className="flex flex-col gap-4 bg-white dark:bg-zinc-950 p-6 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-zinc-50/50 border-zinc-200 focus:border-zinc-400 focus:ring-0"
                            />
                        </div>
                        <div className="hidden md:block">
                            <span className="text-xs font-bold text-zinc-400 uppercase">{filteredInvoices.length} Registros</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                        {/* Category Filter */}
                        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200">
                            <Tag className="h-3.5 w-3.5 text-zinc-400" />
                            <select
                                className="bg-transparent text-xs font-medium outline-none text-zinc-700 dark:text-zinc-300"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">Todas las Categorías</option>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>

                        {/* Unified Date Picker UI */}
                        <div className="flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 shadow-inner">
                            <Button
                                variant={dateFilterMode === 'single' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-[10px] px-2"
                                onClick={() => setDateFilterMode('single')}
                            >
                                Fecha
                            </Button>
                            <Button
                                variant={dateFilterMode === 'range' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-[10px] px-2"
                                onClick={() => setDateFilterMode('range')}
                            >
                                Rango
                            </Button>
                            <div className="w-[1px] h-4 bg-zinc-300 mx-1" />
                            <div className="flex items-center gap-1">
                                <Input
                                    type="date"
                                    className="h-7 w-28 bg-transparent border-none text-[10px] p-0 focus-visible:ring-0"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                />
                                {dateFilterMode === 'range' && (
                                    <>
                                        <span className="text-zinc-400">-</span>
                                        <Input
                                            type="date"
                                            className="h-7 w-28 bg-transparent border-none text-[10px] p-0 focus-visible:ring-0"
                                            value={dateRange.to}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {(dateRange.from || dateRange.to || selectedCategory !== 'all' || search) ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-500 hover:text-zinc-900 text-xs h-8"
                                onClick={() => {
                                    setSelectedCategory('all')
                                    setDateRange({ from: '', to: '' })
                                    setSearch('')
                                }}
                            >
                                Limpiar
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-white dark:bg-zinc-950 overflow-x-auto shadow-sm">
                <Table>
                    <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead className="font-bold text-zinc-900">Ticket #</TableHead>
                            <TableHead className="font-bold text-zinc-900">Fecha</TableHead>
                            <TableHead className="font-bold text-zinc-900">Forma de Pago</TableHead>
                            <TableHead className="text-right font-bold text-zinc-900">Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                                    No se encontraron registros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((inv) => (
                                <Fragment key={inv.id}>
                                    <TableRow
                                        className={`cursor-pointer transition-colors group ${inv.fecha_contable && (new Date(inv.fecha_venta).getMonth() !== new Date(inv.fecha_contable).getMonth() || new Date(inv.fecha_venta).getFullYear() !== new Date(inv.fecha_contable).getFullYear())
                                                ? 'bg-purple-50/40 hover:bg-purple-50/70 border-l-2 border-l-purple-400'
                                                : 'hover:bg-zinc-50/30'
                                            }`}
                                        onClick={() => toggleRow(inv.id)}
                                    >
                                        <TableCell>
                                            {expandedRows[inv.id] ? (
                                                <ChevronUp className="h-4 w-4 text-zinc-400" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-zinc-400" />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono font-bold text-zinc-700">
                                            #{inv.ticket_numero}
                                        </TableCell>
                                        <TableCell className="text-zinc-600">
                                            <div className="flex flex-col">
                                                <span>{format(new Date(inv.fecha_venta), 'PPP', { locale: es })}</span>
                                                {inv.fecha_contable && (new Date(inv.fecha_venta).getMonth() !== new Date(inv.fecha_contable).getMonth() || new Date(inv.fecha_venta).getFullYear() !== new Date(inv.fecha_contable).getFullYear()) && (
                                                    <div className="flex items-center gap-1 mt-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md w-fit border border-purple-100" title={`Contabilizado en: ${format(new Date(inv.fecha_contable), 'MMMM yyyy', { locale: es })}`}>
                                                        <CalendarClock className="h-3 w-3" />
                                                        <span className="text-[10px] font-bold uppercase tracking-tight">
                                                            {format(new Date(inv.fecha_contable), 'MMM yyyy', { locale: es })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                                                {inv.forma_pago}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-blue-600">
                                            Q{inv.total_q.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            window.open(inv.file_url, '_blank')
                                                        }}
                                                    >
                                                        Ver Comprobante
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            deleteInvoice(inv.id)
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>

                                    {expandedRows[inv.id] && (
                                        <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/30 border-t-0">
                                            <TableCell colSpan={6} className="p-0">
                                                <div className="px-12 py-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div className="space-y-1">
                                                                <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400">Detalle de Operación</h4>
                                                                <p className="text-xs text-zinc-500">Desglose de productos y servicios para el ticket #{inv.ticket_numero}</p>
                                                            </div>
                                                            {inv.observaciones_doctora && (
                                                                <div className="text-sm text-zinc-600 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 italic max-w-md shadow-sm">
                                                                    <span className="text-blue-400 mr-2 font-serif text-xl">“</span>
                                                                    {inv.observaciones_doctora}
                                                                    <span className="text-blue-400 ml-2 font-serif text-xl">”</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {inv.fecha_contable && (new Date(inv.fecha_venta).getMonth() !== new Date(inv.fecha_contable).getMonth() || new Date(inv.fecha_venta).getFullYear() !== new Date(inv.fecha_contable).getFullYear()) && (
                                                            <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-xl flex items-start gap-3 w-full max-w-2xl">
                                                                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                                                                    <CalendarClock size={18} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">Nota Contable</h4>
                                                                    <p className="text-xs text-purple-600/80 dark:text-purple-400 font-medium leading-relaxed mt-1">
                                                                        Este registro tiene una fecha contable diferente a su fecha de emisión. Pertenece al cierre de <span className="font-black underline">{format(new Date(inv.fecha_contable), 'MMMM yyyy', { locale: es })}</span>.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-lg">
                                                        <Table>
                                                            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                                                                <TableRow>
                                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 w-[40px]">#</TableHead>
                                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Descripción</TableHead>
                                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 w-[180px]">Categoría</TableHead>
                                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 text-center w-[100px]">Comisión</TableHead>
                                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right w-[80px]">Cant.</TableHead>
                                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right w-[120px]">P. Unitario</TableHead>
                                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right w-[120px]">Subtotal</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {inv.invoice_items?.map((item, idx) => (
                                                                    <TableRow key={item.id || idx} className="hover:bg-zinc-50/30 transition-colors">
                                                                        <TableCell className="text-[10px] font-bold text-zinc-400">{idx + 1}</TableCell>
                                                                        <TableCell className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{item.descripcion}</TableCell>
                                                                        <TableCell>
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                                                                <Tag className="mr-1 h-3 w-3" />
                                                                                {categories.find(c => c.id === item.categoria_id)?.name || 'General'}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {item.comisionable ? (
                                                                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" strokeWidth={3} />
                                                                            ) : (
                                                                                <XCircle className="h-4 w-4 text-red-500 mx-auto opacity-20" />
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right text-sm font-medium text-zinc-600">{item.cantidad}</TableCell>
                                                                        <TableCell className="text-right text-sm font-medium text-zinc-600">Q{item.precio_unitario_q.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                                        <TableCell className="text-right text-sm font-black text-zinc-900 dark:text-zinc-100">Q{item.total_q.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>

                                                    <div className="flex justify-end pt-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                window.open(inv.file_url, '_blank')
                                                            }}
                                                        >
                                                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                                            Ver Factura Original
                                                        </Button>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
