'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, User, Clock, AlertTriangle, Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Activity, Trash2, Edit3, PlusCircle, Download, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AuditLogEntry {
    id: string
    table_name: string
    record_id: string
    action: string
    old_data: any
    new_data: any
    auth_uid: string
    created_at: string
    user_name: string
    items?: any[]
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(20)
    const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
    const supabase = createClient()

    const toggleExpand = (id: string) => {
        setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }))
    }
    const router = useRouter()

    useEffect(() => {
        async function fetchAuditLogs() {
            setIsLoading(true)
            
            // Check auth and role first
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Check if user is admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                router.push('/dashboard')
                return
            }

            // Fetch true audit logs, bypassing the 1000 row hard limit by using auto-pagination
            let allAuditData: any[] = []
            let page = 0
            const pageSize = 1000
            let hasMore = true
            
            while (hasMore) {
                const { data, error } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(page * pageSize, (page + 1) * pageSize - 1)
                
                if (error) {
                    console.error('Error fetching audit_logs:', error)
                    setIsLoading(false)
                    return
                }

                if (data && data.length > 0) {
                    allAuditData = [...allAuditData, ...data]
                    if (data.length < pageSize) {
                        hasMore = false
                    } else {
                        page++
                    }
                } else {
                    hasMore = false
                }
            }

            // Fetch Profiles to map auth_uid to names
            const uniqueUids = Array.from(new Set(allAuditData.map(log => log.auth_uid).filter(Boolean)))
            
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', uniqueUids)

            const profileMap = (profilesData || []).reduce((acc: any, curr: any) => {
                acc[curr.id] = curr.full_name
                return acc
            }, {})
                
            // Grouping logic: attach invoice_items to invoices
            const invoiceLogs = allAuditData.filter((log: any) => log.table_name === 'invoices')
            const itemLogs = allAuditData.filter((log: any) => log.table_name === 'invoice_items')

            const groupedLogs = invoiceLogs.map((invLog: any) => {
                const relatedItems = itemLogs.filter((itemLog: any) => {
                    const parentId = itemLog.new_data?.invoice_id || itemLog.old_data?.invoice_id
                    // Must be the same invoice and same action (e.g. DELETE cascade creates both at same time)
                    const timeDiffMillis = Math.abs(new Date(itemLog.created_at).getTime() - new Date(invLog.created_at).getTime())
                    return parentId === invLog.record_id && itemLog.action === invLog.action && timeDiffMillis < 60000
                })

                return {
                    ...invLog,
                    user_name: profileMap[invLog.auth_uid] || 'Sistema / Desconocido',
                    items: relatedItems.map((i: any) => ({
                        ...i,
                        user_name: profileMap[i.auth_uid] || 'Sistema / Desconocido'
                    }))
                }
            })
            
            setLogs(groupedLogs)
            setIsLoading(false)
        }

        fetchAuditLogs()
    }, [])

    const filteredLogs = logs.filter(log => 
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage))
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, itemsPerPage])

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'INSERT':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shadow-none"><PlusCircle className="w-3 h-3 mr-1" /> Creación</Badge>
            case 'UPDATE':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none shadow-none"><Edit3 className="w-3 h-3 mr-1" /> Edición</Badge>
            case 'DELETE':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none shadow-none"><Trash2 className="w-3 h-3 mr-1" /> Eliminación</Badge>
            default:
                return <Badge variant="outline">{action}</Badge>
        }
    }

    const exportToCSV = () => {
        // Simple CSV generation
        const headers = ['ID', 'Fecha', 'Usuario', 'Acción', 'Tabla', 'ID Registro Modificado'];
        const rows = logs.map(l => [
            l.id,
            l.created_at,
            l.user_name,
            l.action,
            l.table_name,
            l.record_id
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `auditoria_mascotas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
                        <ShieldCheck className="text-blue-600 h-10 w-10" /> Log de Auditoría
                    </h1>
                    <p className="text-zinc-500 font-medium">Cronología estricta de base de datos sobre creación, edición y eliminación de datos.</p>
                </div>
                <Button onClick={exportToCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg">
                    <Download className="w-4 h-4 mr-2" /> Exportar CSV
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-xl bg-white dark:bg-zinc-950 rounded-[32px] overflow-hidden group">
                    <CardHeader className="p-6 pb-2">
                        <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-500">
                            <Activity className="text-blue-600 h-6 w-6" />
                        </div>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400">Total Eventos</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <p className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">{logs.length}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white dark:bg-zinc-950 rounded-[32px] overflow-hidden group">
                    <CardHeader className="p-6 pb-2">
                        <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-500">
                            <Trash2 className="text-red-600 h-6 w-6" />
                        </div>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400">Eliminaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <p className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">
                            {logs.filter(l => l.action === 'DELETE').length}
                        </p>
                    </CardContent>
                </Card>

                <div className="bg-gradient-to-br from-slate-800 to-zinc-900 rounded-[32px] p-8 text-white shadow-xl flex flex-col justify-center gap-2">
                    <h3 className="font-black text-xl tracking-tight leading-tight flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" /> Seguridad Activa
                    </h3>
                    <p className="text-white/70 text-sm font-medium">Todos los movimientos a nivel de base de datos están siendo registrados de manera automática e inmutable.</p>
                </div>
            </div>

            <Card className="border-none shadow-2xl bg-white dark:bg-zinc-950 rounded-[40px] overflow-hidden">
                <CardHeader className="p-8 border-b border-zinc-100 dark:border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-black tracking-tight">Eventos del Sistema</CardTitle>
                        <CardDescription>Visualiza quién modificó qué cosa y en qué momento exacto.</CardDescription>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-3 h-4 w-4 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input 
                            placeholder="Buscar por usuario, acción o tabla..." 
                            className="pl-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-blue-500/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 font-medium">Mostrar</span>
                        <select
                            className="h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs px-2 focus:ring-0 outline-none"
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-xs text-zinc-500 font-medium">registros</span>
                    </div>
                    <div className="text-xs text-zinc-500 font-medium">
                        Página {currentPage} de {totalPages} ({filteredLogs.length} total)
                    </div>
                </div>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-900">
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead className="py-6 px-8 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Fecha / Hora</TableHead>
                                    <TableHead className="py-6 px-8 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Usuario</TableHead>
                                    <TableHead className="py-6 px-8 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Acción</TableHead>
                                    <TableHead className="py-6 px-8 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Resumen Operación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-40 text-center text-zinc-500 font-medium">Cargando logs desde base de datos...</TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-40 text-center text-zinc-500 font-medium">No se encontraron eventos.</TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedLogs.map((log) => {
                                        const contextData = log.action === 'DELETE' ? log.old_data : log.new_data;
                                        let summary = `Factura ID: ${log.record_id.slice(0, 8)}...`;
                                        const isExpanded = expandedLogs[log.id];
                                        
                                        if (contextData?.ticket_numero) {
                                            summary = `Factura #${contextData.ticket_numero} | General: Q${Number(contextData.total_q || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                        }

                                        return (
                                            <Fragment key={log.id}>
                                                <TableRow onClick={() => toggleExpand(log.id)} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer border-b border-zinc-100 dark:border-zinc-900">
                                                    <TableCell className="pl-4">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 pointer-events-none">
                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="py-4 px-8">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                                {format(new Date(log.created_at), 'dd MMM yyyy', { locale: es })}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {format(new Date(log.created_at), 'HH:mm:ss')}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 px-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                                                <User className="h-4 w-4 text-zinc-500" />
                                                            </div>
                                                            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{log.user_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 px-8">
                                                        {getActionBadge(log.action)}
                                                    </TableCell>
                                                    <TableCell className="py-4 px-8">
                                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                                            {summary}
                                                        </span>
                                                        {log.items && log.items.length > 0 && (
                                                            <span className="ml-3 text-xs font-bold text-zinc-400 dark:text-zinc-500">
                                                                ({log.items.length} productos afectados)
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                                
                                                {isExpanded && log.items && log.items.length > 0 && (
                                                    <TableRow className="bg-zinc-50 dark:bg-zinc-900/30">
                                                        <TableCell colSpan={5} className="p-0 border-b-2 border-zinc-200 dark:border-zinc-800">
                                                            <div className="px-16 py-6 border-l-4 border-blue-500 ml-8 my-4 bg-white dark:bg-zinc-950 rounded-r-2xl shadow-sm">
                                                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                    <Tag className="w-3 h-3" /> Detalle de Productos en este Ticket
                                                                </h4>
                                                                <div className="space-y-0 divide-y divide-zinc-100 dark:divide-zinc-900">
                                                                    {log.items.map((item: any) => {
                                                                        const itemData = item.action === 'DELETE' ? item.old_data : item.new_data;
                                                                        return (
                                                                            <div key={item.id} className="flex items-center justify-between py-3">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
                                                                                    <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">{itemData?.descripcion || 'Ítem desconocido'}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-8 text-right">
                                                                                    <div>
                                                                                        <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Unitario</span>
                                                                                        <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-400">Q{Number(itemData?.precio_unitario_q || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Cant</span>
                                                                                        <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-400">x{itemData?.cantidad || 1}</span>
                                                                                    </div>
                                                                                    <div className="w-24">
                                                                                        <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Subtotal</span>
                                                                                        <span className="font-black text-sm text-zinc-900 dark:text-zinc-100">Q{Number(itemData?.total_q || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {totalPages > 1 && (
                        <div className="px-8 py-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-end gap-2 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 shadow-sm"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 shadow-sm"
                            >
                                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
