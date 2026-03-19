'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    ListFilter,
    Tag,
    User,
    Banknote,
    Award,
    Ban
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Category {
    id: string
    name: string
}

interface InvoiceItemDetails {
    id: string
    descripcion: string
    cantidad: number
    precio_unitario_q: number
    total_q: number
    categoria_id: string
    invoice_id: string
    comisionable: boolean

    // Joined from invoice
    ticket_numero: number
    fecha_venta: string
    fecha_contable?: string
    doctor_name: string
    patient_name?: string
}

export default function ItemsPage() {
    const [items, setItems] = useState<InvoiceItemDetails[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [comisionFilter, setComisionFilter] = useState<'all' | 'comisionable' | 'non_comisionable'>('all')
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(20)

    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true)

            // 1. Fetch categories
            const { data: catData } = await supabase.from('categories').select('*')
            if (catData) setCategories(catData)

            // 2. Fetch profiles
            const { data: profData } = await supabase.from('profiles').select('id, full_name')
            const profileMap = (profData || []).reduce((acc: any, p: any) => {
                acc[p.id] = p.full_name
                return acc
            }, {})

            // 3. Fetch invoice_items and join invoices
            const { data: itemsData, error } = await supabase
                .from('invoice_items')
                .select(`
                    id, 
                    descripcion, 
                    cantidad, 
                    precio_unitario_q, 
                    total_q, 
                    categoria_id, 
                    invoice_id,
                    comisionable,
                    invoices (
                        ticket_numero,
                        fecha_venta,
                        fecha_contable,
                        doctor_id,
                        patient_name
                    )
                `)
                .order('id', { ascending: false })
                .limit(2000) // limit for performance in a broad search

            if (error) {
                console.error('Error fetching items:', error)
            } else if (itemsData) {
                const formattedItems: InvoiceItemDetails[] = itemsData.map((item: any) => {
                    const invoice = Array.isArray(item.invoices) ? item.invoices[0] : item.invoices
                    return {
                        id: item.id,
                        descripcion: item.descripcion,
                        cantidad: item.cantidad,
                        precio_unitario_q: item.precio_unitario_q,
                        total_q: item.total_q,
                        categoria_id: item.categoria_id,
                        invoice_id: item.invoice_id,
                        comisionable: item.comisionable,
                        ticket_numero: invoice?.ticket_numero || 0,
                        fecha_venta: invoice?.fecha_venta || '',
                        fecha_contable: invoice?.fecha_contable || '',
                        doctor_name: profileMap[invoice?.doctor_id] || 'Desconocido',
                        patient_name: invoice?.patient_name || ''
                    }
                })

                setItems(formattedItems)
            }

            setIsLoading(false)
        }

        fetchData()
    }, [])

    const getCategoryName = (id: string) => {
        return categories.find(c => c.id === id)?.name || 'General'
    }

    // Apply Filters
    const filteredItems = items.filter(item => {
        const matchesSearch = item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              item.ticket_numero.toString().includes(searchTerm) ||
                              (item.patient_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || item.categoria_id === selectedCategory
        const matchesComision = comisionFilter === 'all' || 
            (comisionFilter === 'comisionable' && item.comisionable) || 
            (comisionFilter === 'non_comisionable' && !item.comisionable)

        return matchesSearch && matchesCategory && matchesComision
    })

    const totalGeneral = filteredItems.reduce((acc, item) => acc + item.total_q, 0)
    const totalComisionable = filteredItems.filter(i => i.comisionable).reduce((acc, item) => acc + item.total_q, 0)
    const totalNonComisionable = filteredItems.filter(i => !i.comisionable).reduce((acc, item) => acc + item.total_q, 0)

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage))
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, selectedCategory, comisionFilter, itemsPerPage])

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
                        <ListFilter className="text-blue-600 h-10 w-10" /> Búsqueda de Ítems
                    </h1>
                    <p className="text-sm font-medium text-zinc-500 max-w-2xl">
                        Encuentra y filtra productos, servicios y consultas registrados línea por línea en todas las facturas.
                    </p>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-950 p-6 rounded-[24px] border border-border shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Items General</p>
                        <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">
                            Q{totalGeneral.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                        <Banknote className="h-6 w-6 text-emerald-600" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-950 p-6 rounded-[24px] border border-border shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Items Comisionables</p>
                        <p className="text-3xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400">
                            Q{totalComisionable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                        <Award className="h-6 w-6 text-indigo-600" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-950 p-6 rounded-[24px] border border-border shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">No Comisionables</p>
                        <p className="text-3xl font-black tracking-tighter text-orange-600 dark:text-orange-400">
                            Q{totalNonComisionable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="h-12 w-12 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center">
                        <Ban className="h-6 w-6 text-orange-600" />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-zinc-950 p-4 lg:p-6 rounded-2xl border border-border shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            placeholder="Buscar producto, paciente o n° de ticket..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-zinc-50/50 border-zinc-200 focus:border-zinc-400"
                        />
                    </div>
                    
                    <div className="w-full sm:w-auto relative group">
                        <select
                            className="h-10 w-full sm:w-auto rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm px-3 pr-8 focus:ring-0 outline-none text-zinc-700 dark:text-zinc-300 font-medium"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">Todas las Categorías</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full sm:w-auto relative group">
                        <select
                            className="h-10 w-full sm:w-auto rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm px-3 pr-8 focus:ring-0 outline-none text-zinc-700 dark:text-zinc-300 font-medium"
                            value={comisionFilter}
                            onChange={(e) => setComisionFilter(e.target.value as any)}
                        >
                            <option value="all">Cualquier tipo</option>
                            <option value="comisionable">Solo Comisionables</option>
                            <option value="non_comisionable">Solo No Comisionables</option>
                        </select>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-4 border-l border-zinc-200 dark:border-zinc-800 pl-6">
                    <div className="flex flex-col items-start">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{filteredItems.length} Encontrados</span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">Mostrar</span>
                            <select
                                className="h-6 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-[10px] px-1 focus:ring-0 outline-none font-bold"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">por página</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-border overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/50">
                            <TableRow>
                                <TableHead className="w-[120px] text-xs font-black uppercase tracking-widest text-zinc-400 py-5 pl-6">Ticket / Fecha</TableHead>
                                <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-400 py-5">Ítem y Categoría</TableHead>
                                <TableHead className="text-xs font-black uppercase tracking-widest text-zinc-400 py-5">Paciente / Doctor</TableHead>
                                <TableHead className="text-right w-[100px] text-xs font-black uppercase tracking-widest text-zinc-400 py-5">Cant.</TableHead>
                                <TableHead className="text-right w-[120px] text-xs font-black uppercase tracking-widest text-zinc-400 py-5 pr-6">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-50" />
                                            <span className="text-sm font-medium animate-pulse">Cargando registros...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-zinc-500">
                                        <ListFilter className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-3" />
                                        <span className="font-medium text-sm">No se encontraron ítems con esos filtros.</span>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedItems.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 group transition-colors">
                                        <TableCell className="py-4 pl-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center">
                                                    #{item.ticket_numero}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                                                    {format(new Date(item.fecha_venta + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                                                    {item.descripcion}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <span className="inline-flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full uppercase tracking-tighter w-fit">
                                                        <Tag size={10} className="mr-1" />
                                                        {getCategoryName(item.categoria_id)}
                                                    </span>
                                                    {item.comisionable ? (
                                                        <span className="inline-flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase tracking-tighter w-fit" title="Comisionable">
                                                            <Award size={10} className="mr-1" /> Comisionable
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full uppercase tracking-tighter w-fit" title="No Comisionable">
                                                            <Ban size={10} className="mr-1" /> N/C
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col gap-1.5">
                                                {item.patient_name ? (
                                                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                        <User size={12} className="text-zinc-400" />
                                                        {item.patient_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-zinc-400 italic flex items-center gap-1.5">
                                                        Sin paciente vinculado
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                                    {item.doctor_name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-zinc-500 py-4">
                                            {item.cantidad}
                                        </TableCell>
                                        <TableCell className="text-right py-4 pr-6">
                                            <span className="font-black text-sm text-zinc-900 dark:text-zinc-100 table-cell">
                                                Q{item.total_q.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[10px] text-zinc-400 font-bold block mt-1">
                                                @ Q{(item.precio_unitario_q || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} c/u
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pb-8">
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-9 shadow-sm font-bold tracking-wide"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-9 shadow-sm font-bold tracking-wide"
                        >
                            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
