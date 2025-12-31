'use client'

import { useState, useEffect } from 'react'
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
    Search,
    Calculator,
    CheckCircle2,
    Calendar as CalendarIcon,
    DollarSign,
    Wallet,
    ArrowUpRight,
    TrendingUp,
    Briefcase,
    Lock,
    Trash2,
    MoreHorizontal,
    Trophy
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Settlement {
    id: string
    mes: number
    anio: number
    total_quetzales: number
    total_usd: number
    estado: string
    created_at: string
    metodo_pago: string
    sueldo_base_usd: number
    comision_quetzales: number
    alcanzo_meta?: boolean
    bono_meta_usd?: number
}

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function SettlementsHistoryPage() {
    const [settlements, setSettlements] = useState<Settlement[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const supabase = createClient()

    const [userRole, setUserRole] = useState<'admin' | 'doctor' | null>(null)
    const [isCheckingRole, setIsCheckingRole] = useState(true)

    useEffect(() => {
        async function fetchInitialData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const email = user.email || ''

                // 1. Metadatos
                let role = user.app_metadata?.role || user.user_metadata?.role

                // 2. Base de datos
                if (!role) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .maybeSingle()
                    role = profile?.role
                }

                // 3. Override por Email (Seguridad dueños)
                const adminEmails = ['cysalguero@gmail.com', 'sergiounah@gmail.com']
                if (adminEmails.includes(email.toLowerCase())) {
                    role = 'admin'
                }

                setUserRole((role as 'admin' | 'doctor') || 'doctor')
            }
            setIsCheckingRole(false)
            fetchSettlements()
        }
        fetchInitialData()
    }, [])

    async function fetchSettlements() {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('settlements')
                .select('*')
                .order('anio', { ascending: false })
                .order('mes', { ascending: false })

            if (error) throw error
            setSettlements(data || [])
        } catch (err) {
            console.error('Error fetching settlements:', err)
        } finally {
            setIsLoading(false)
        }
    }

    async function deleteSettlement(id: string) {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro de cierre? Esta acción no se puede deshacer.')) return

        try {
            const { error } = await supabase
                .from('settlements')
                .delete()
                .eq('id', id)

            if (error) throw error
            setSettlements(prev => prev.filter(s => s.id !== id))
        } catch (err) {
            console.error('Error deleting settlement:', err)
            alert('Error al eliminar el registro de cierre.')
        }
    }

    const filteredSettlements = settlements.filter(s => {
        const monthName = MONTHS[s.mes].toLowerCase()
        const yearStr = s.anio.toString()
        const searchLower = search.toLowerCase()
        return monthName.includes(searchLower) || yearStr.includes(searchLower)
    })

    if (isCheckingRole || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
                <p className="text-zinc-500 font-medium italic">
                    {isCheckingRole ? "Verificando credenciales..." : "Cargando historial de pagos..."}
                </p>
            </div>
        )
    }

    if (userRole !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-[32px] text-red-600 dark:text-red-400">
                    <Lock size={64} strokeWidth={2.5} />
                </div>
                <div className="max-w-md space-y-2">
                    <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">Acceso Restringido</h2>
                    <p className="text-zinc-500 font-medium text-lg leading-tight">
                        Lo sentimos, el historial de pagos solo es accesible para administradores.
                    </p>
                </div>
                <Button
                    onClick={() => window.location.href = '/dashboard/metrics'}
                    className="h-14 px-8 bg-zinc-900 text-white rounded-2xl font-black text-lg shadow-xl"
                >
                    Volver al Dashboard
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none gap-6">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl">
                            <CalendarIcon size={24} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
                            Historial de Pagos
                        </h2>
                    </div>
                    <p className="text-zinc-500 font-medium text-sm">
                        Visualización de todos los cierres mensuales registrados.
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Buscar por mes o año..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-11 bg-zinc-50/50 border-zinc-200 rounded-2xl focus:border-blue-500 focus:ring-0 font-medium"
                    />
                </div>
            </div>

            {/* Main Stats Summary in History */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white dark:bg-zinc-950 rounded-[24px]">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Liquidado (Q)</p>
                            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                                Q {settlements.reduce((acc, s) => acc + s.total_quetzales, 0).toLocaleString('es-GT')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white dark:bg-zinc-950 rounded-[24px]">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Comisiones (Q)</p>
                            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                                Q {settlements.reduce((acc, s) => acc + s.comision_quetzales, 0).toLocaleString('es-GT')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-xl shadow-zinc-200/40 bg-white dark:bg-zinc-950 rounded-[24px]">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Meses Registrados</p>
                            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                                {settlements.length} Registros
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* History Table */}
            <div className="rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-2xl shadow-zinc-200/20 dark:shadow-none">
                <Table>
                    <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 h-16">
                        <TableRow>
                            <TableHead className="pl-8 font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-[0.2em]">Periodo</TableHead>
                            <TableHead className="font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-[0.2em]">Sueldo Base (USD)</TableHead>
                            <TableHead className="font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-[0.2em]">Comisiones (Q)</TableHead>
                            <TableHead className="font-black text-amber-600 uppercase text-[10px] tracking-[0.2em]">Meta (Bono)</TableHead>
                            <TableHead className="font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-[0.2em]">Total Final</TableHead>
                            <TableHead className="font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-[0.2em]">Método</TableHead>
                            <TableHead className="font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-[0.2em]">Estado</TableHead>
                            <TableHead className="pr-8 font-black text-zinc-900 dark:text-zinc-100 uppercase text-[10px] tracking-[0.2em] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSettlements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
                                        <ArrowUpRight size={32} className="opacity-20" />
                                        <p className="font-medium">No se encontraron liquidaciones registradas.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSettlements.map((s) => (
                                <TableRow key={s.id} className="h-20 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors border-zinc-100 dark:border-zinc-900">
                                    <TableCell className="pl-8">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-zinc-900 dark:text-zinc-100 text-lg tracking-tighter">
                                                    {MONTHS[s.mes]}
                                                </span>
                                                {s.alcanzo_meta && (
                                                    <Trophy size={14} className="text-amber-500 fill-amber-500" />
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-zinc-400">{s.anio}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-black text-zinc-600 dark:text-zinc-400">
                                        $ {s.sueldo_base_usd.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="font-black text-blue-600">
                                        Q {s.comision_quetzales.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {s.alcanzo_meta ? (
                                            <div className="flex flex-col">
                                                <span className="font-black text-amber-600">$ 100.00</span>
                                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Meta Lograda</span>
                                            </div>
                                        ) : (
                                            <span className="text-zinc-300 font-bold">$ 0.00</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-black text-zinc-900 dark:text-zinc-100">$ {s.total_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-bold text-blue-500">Q {s.total_quetzales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                            {s.metodo_pago || 'Efectivo'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            <CheckCircle2 size={12} /> {s.estado}
                                        </span>
                                    </TableCell>
                                    <TableCell className="pr-8 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => deleteSettlement(s.id)}
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Cierre
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <p className="text-center text-[11px] font-bold text-zinc-400 uppercase tracking-widest pt-4">
                * Los registros en esta sección son históricos y solo de lectura.
            </p>
        </div>
    )
}
