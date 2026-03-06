'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    parseISO,
    subDays,
    subMonths,
    addMonths,
    setMonth,
    setYear,
    isSameDay
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
    LayoutDashboard,
    TrendingUp,
    Users,
    DollarSign,
    Activity,
    ShoppingBag,
    CreditCard,
    ArrowUpRight,
    RefreshCw,
    ChevronDown,
    Calendar as CalendarIcon,
    ArrowDownRight,
    Search,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    PieChart as RePieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as ReTooltip,
    Legend,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    BarChart,
    Bar
} from 'recharts'
import { Button } from '@/components/ui/button'

interface Stats {
    totalGrossIncome: number
    totalIncome: number
    totalCommission: number
    totalProcedures: number
    totalCustomers: number
    categoryData: { name: string, value: number, color: string }[]
    revenueTrend: { date: string, income: number }[]
    paymentMethods: { name: string, value: number }[]
    topProducts: { name: string, count: number, revenue: number }[]
    prevMonthIncome: number
    speciesData: { name: string, value: number, color: string }[]
    vaccineOpportunities: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']
const SPECIES_COLORS: Record<string, string> = {
    'canino': '#3b82f6', // Blue
    'felino': '#f97316', // Orange
    'ave': '#eab308',   // Yellow
    'conejo': '#ec4899', // Pink
    'roedor': '#a855f7', // Purple
    'otro': '#94a3b8'   // Gray
}
const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

export default function MetricsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState<Stats | null>(null)
    const [userRole, setUserRole] = useState<'admin' | 'doctor'>('doctor')
    const [currentDate, setCurrentDate] = useState(new Date())
    const supabase = createClient()

    useEffect(() => {
        fetchDashboardData()
    }, [currentDate])

    async function fetchDashboardData() {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const email = user.email || ''

            // Prioridad 1: Revisar metadatos del usuario (Supabase Auth)
            let role = user.app_metadata?.role || user.user_metadata?.role

            // Prioridad 2: Revisar tabla profiles
            if (!role) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle()
                role = profile?.role
            }

            // Prioridad 3: Hard-override por correo (Seguridad total para el dueño)
            const adminEmails = ['cysalguero@gmail.com', 'sergiounah@gmail.com']
            if (adminEmails.includes(email.toLowerCase())) {
                role = 'admin'
            }

            const finalRole = (role as 'admin' | 'doctor') || 'doctor'
            setUserRole(finalRole)

            const start = startOfMonth(currentDate)
            const end = endOfMonth(currentDate)

            let query = supabase
                .from('invoices')
                .select('*, invoice_items(*, categories(name))')
                .gte('fecha_contable', format(start, 'yyyy-MM-dd'))
                .lte('fecha_contable', format(end, 'yyyy-MM-dd'))

            if (role === 'doctor') {
                query = query.eq('doctor_id', user.id)
            }

            const { data: invoices, error: invError } = await query
            if (invError) throw invError

            let totalIncome = 0 // Comisionable
            let totalGrossIncome = 0 // Total facturado (con o sin comisión)
            let totalProcedures = 0
            const customersCount = invoices.length
            const categoryMap: Record<string, number> = {}
            const paymentMap: Record<string, number> = {}
            const productsMap: Record<string, { count: number, revenue: number }> = {}
            const speciesMap: Record<string, number> = {}
            const vaccineOpps = new Set<string>() // To count unique patients with 'No Vigente'

            // Process Trend for the current viewing month
            const monthDays = eachDayOfInterval({ start, end })
            const trendMap: Record<string, number> = {}
            monthDays.forEach(day => {
                trendMap[format(day, 'yyyy-MM-dd')] = 0
            })

            invoices.forEach(inv => {
                let invoiceCommissionableTotal = 0

                inv.invoice_items?.forEach((item: any) => {
                    const itemTotal = item.total_q || 0

                    // Sumamos SIEMPRE al gross income
                    totalGrossIncome += itemTotal

                    if (item.comisionable) {
                        invoiceCommissionableTotal += itemTotal
                        totalIncome += itemTotal

                        // Trend should follow commissionable income
                        const dateKey = inv.fecha_contable || inv.fecha_venta
                        if (trendMap[dateKey] !== undefined) {
                            trendMap[dateKey] += itemTotal
                        }

                        // Categories follow commissionable income
                        const catName = item.categories?.name || 'General'
                        categoryMap[catName] = (categoryMap[catName] || 0) + itemTotal

                        // Top Products follow commissionable income
                        const desc = item.descripcion || 'Sin nombre'
                        if (!productsMap[desc]) {
                            productsMap[desc] = { count: 0, revenue: 0 }
                        }
                        productsMap[desc].count += item.cantidad || 0
                        productsMap[desc].revenue += itemTotal

                        // User request: Count ONLY commissionable items for Procedures
                        totalProcedures += item.cantidad || 0
                    }
                })

                // Payment Methods: Should we show the whole cash flow or only the commissionable part?
                // User said "lo demás NO, lo que no es comisionable solo esta para registro, pero no para contarlo".
                // I'll stick to commissionable only for all financial charts to be consistent with the main KPI.
                const method = inv.forma_pago || 'No especificado'
                paymentMap[method] = (paymentMap[method] || 0) + invoiceCommissionableTotal

                // Species Revenue (using Commissionable Total)
                const s = inv.patient_species?.toLowerCase() || 'otro'
                const normalizedSpecies = s.includes('canin') || s.includes('perr') ? 'canino' :
                    s.includes('felin') || s.includes('gat') ? 'felino' :
                        s.includes('ave') || s.includes('pajar') ? 'ave' :
                            s.includes('conej') ? 'conejo' :
                                s.includes('roedor') || s.includes('hamster') ? 'roedor' : 'otro'

                speciesMap[normalizedSpecies] = (speciesMap[normalizedSpecies] || 0) + invoiceCommissionableTotal

                // Vaccine Opportunities
                // Logic: Check if patient has 'No' in es_vacunal
                const pData = inv.patient_data as any
                if (pData?.es_vacunal && (pData.es_vacunal.toLowerCase().includes('no') || pData.es_vacunal.toLowerCase().includes('vencid'))) {
                    vaccineOpps.add(inv.patient_history_number || inv.patient_name || `unknown-${inv.id}`)
                }
            })

            // FETCH PREVIOUS MONTH DATA FOR COMPARISON
            const prevStart = startOfMonth(subMonths(currentDate, 1))
            const prevEnd = endOfMonth(subMonths(currentDate, 1))

            let prevQuery = supabase
                .from('invoices')
                .select('invoice_items(total_q, comisionable)')
                .gte('fecha_contable', format(prevStart, 'yyyy-MM-dd'))
                .lte('fecha_contable', format(prevEnd, 'yyyy-MM-dd'))

            if (role === 'doctor') {
                prevQuery = prevQuery.eq('doctor_id', user.id)
            }

            const { data: prevInvoices } = await prevQuery
            let prevMonthIncome = 0
            prevInvoices?.forEach(inv => {
                inv.invoice_items?.forEach((item: any) => {
                    if (item.comisionable) prevMonthIncome += item.total_q || 0
                })
            })

            setStats({
                totalGrossIncome,
                totalIncome,
                totalCommission: totalIncome * 0.05,
                totalProcedures,
                totalCustomers: customersCount,
                categoryData: Object.entries(categoryMap).map(([name, value], i) => ({
                    name,
                    value,
                    color: COLORS[i % COLORS.length]
                })),
                revenueTrend: Object.entries(trendMap).map(([date, income]) => ({
                    date: format(parseISO(date), 'dd MMM', { locale: es }),
                    income
                })),
                paymentMethods: Object.entries(paymentMap).map(([name, value]) => ({
                    name,
                    value
                })),
                topProducts: Object.entries(productsMap)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .slice(0, 5)
                    .map(([name, data]) => ({ name, ...data })),
                prevMonthIncome,
                speciesData: Object.entries(speciesMap).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value,
                    color: SPECIES_COLORS[name] || SPECIES_COLORS['otro']
                })).sort((a, b) => b.value - a.value),
                vaccineOpportunities: vaccineOpps.size
            })

        } catch (error) {
            console.error('Error loading dashboard stats:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleMonthChange = (monthIdx: number) => {
        setCurrentDate(setMonth(currentDate, monthIdx))
    }

    const handleYearChange = (year: number) => {
        setCurrentDate(setYear(currentDate, year))
    }

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    if (isLoading && !stats) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header / Filter Navigation */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none gap-6">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl">
                            <LayoutDashboard size={24} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
                            {userRole === 'admin' ? 'Dashboard Global' : 'Mi Dashboard'}
                        </h2>
                    </div>
                    <p className="text-zinc-500 font-medium text-sm">
                        {userRole === 'admin'
                            ? 'Análisis de ventas comisionables de la clínica.'
                            : 'Resumen de tus comisiones y rendimiento personal.'}
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full">
                        <ChevronLeft className="h-4 w-4 text-zinc-600" />
                    </Button>

                    {/* Selectors */}
                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-1 border border-zinc-100 dark:border-zinc-800">
                        <div className="relative group px-2">
                            <select
                                value={currentDate.getMonth()}
                                onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                                className="appearance-none bg-transparent h-9 pl-3 pr-8 text-sm font-black text-zinc-900 dark:text-zinc-50 focus:outline-none cursor-pointer relative z-10"
                            >
                                {MONTHS.map((month, idx) => (
                                    <option key={month} value={idx}>{month}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-hover:text-zinc-900 transition-colors pointer-events-none" />
                        </div>
                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="relative group px-2">
                            <select
                                value={currentDate.getFullYear()}
                                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                                className="appearance-none bg-transparent h-9 pl-3 pr-8 text-sm font-black text-zinc-900 dark:text-zinc-50 focus:outline-none cursor-pointer relative z-10"
                            >
                                {YEARS.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-hover:text-zinc-900 transition-colors pointer-events-none" />
                        </div>
                    </div>

                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full">
                        <ChevronRight className="h-4 w-4 text-zinc-600" />
                    </Button>

                    <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 mx-2" />

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchDashboardData}
                        className="h-9 w-9 rounded-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : 'text-zinc-500'}`} />
                    </Button>
                </div>
            </div>

            {/* Monthly Goal Progress Bar Iterative */}
            {
                stats && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card className="lg:col-span-2 border-none shadow-xl shadow-zinc-200/40 dark:shadow-none bg-white dark:bg-zinc-950 overflow-hidden rounded-3xl">
                            <div className="p-6 md:p-8 space-y-4 h-full flex flex-col justify-center">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-blue-600" />
                                            <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                                                Meta Mensual: {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                                            </h3>
                                        </div>
                                        <p className="text-sm font-medium text-zinc-500">
                                            {/* Logic: $100 bonus for every 30k */}
                                            Has acumulado <span className="text-green-600 font-bold">$ {Math.floor(stats.totalIncome / 30000) * 100} USD</span> en bonos.
                                            {stats.totalIncome % 30000 !== 0 && (
                                                <> Te faltan <span className="text-zinc-900 font-bold">Q {(30000 - (stats.totalIncome % 30000)).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> para el siguiente bono.</>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                                            Q {stats.totalIncome.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-sm font-black text-zinc-400 ml-2 italic">/ Siguiente: Q {((Math.floor(stats.totalIncome / 30000) + 1) * 30000).toLocaleString('es-GT')}</span>
                                    </div>
                                </div>

                                <div className="relative h-4 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden mt-4">
                                    <div
                                        className={`absolute left-0 top-0 h-full transition-all duration-1000 ease-out rounded-full bg-gradient-to-r from-blue-500 to-blue-700 ${stats.totalIncome >= ((Math.floor(stats.totalIncome / 30000) + 1) * 30000) ? 'from-green-400 to-emerald-600' : ''}`}
                                        style={{ width: `${((stats.totalIncome % 30000) / 30000) * 100}%` }}
                                    />
                                    {/* Markers for visual flair */}
                                    {[0.25, 0.5, 0.75].map(p => (
                                        <div key={p} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${p * 100}%` }} />
                                    ))}
                                </div>

                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    <span>Q {(Math.floor(stats.totalIncome / 30000) * 30000).toLocaleString('es-GT')}</span>
                                    <span>{((stats.totalIncome % 30000) / 30000 * 100).toFixed(0)}% DEL HITO ACTUAL</span>
                                    <span>Q {((Math.floor(stats.totalIncome / 30000) + 1) * 30000).toLocaleString('es-GT')}</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="lg:col-span-1 border-none shadow-xl shadow-zinc-200/40 dark:shadow-none bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group">
                            <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform text-zinc-900 dark:text-white">
                                <Activity size={120} />
                            </div>
                            <div className="space-y-4 relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Proyección de Cierre</p>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-zinc-500">
                                        {currentDate.getMonth() === new Date().getMonth() && new Date().getDate() <= 5
                                            ? "Estimado (Basado en mes anterior)"
                                            : "Estimado Fin de Mes"
                                        }
                                    </p>
                                    <div className="flex items-center gap-3">
                                        {/* Hybrid Projection Logic: 
                                        Days 1-5: Show Previous Month Income as the "Target/Estimation"
                                        Day 6+: Show Real Projection based on Daily Average
                                    */}
                                        <h4 className="text-4xl font-black text-zinc-900 dark:text-zinc-50">
                                            Q {
                                                currentDate.getMonth() === new Date().getMonth()
                                                    ? (new Date().getDate() <= 5
                                                        ? (stats.prevMonthIncome || stats.totalIncome).toLocaleString('es-GT', { maximumFractionDigits: 0 })
                                                        : ((stats.totalIncome / Math.max(new Date().getDate(), 1)) * endOfMonth(currentDate).getDate()).toLocaleString('es-GT', { maximumFractionDigits: 0 })
                                                    )
                                                    : stats.totalIncome.toLocaleString('es-GT', { maximumFractionDigits: 0 })
                                            }
                                        </h4>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
                                    {currentDate.getMonth() === new Date().getMonth() && new Date().getDate() <= 5 ? (
                                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/10 px-3 py-1.5 rounded-lg w-fit">
                                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                            <p className="text-xs font-bold uppercase tracking-wide">Calibrando tendencia...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                                <CalendarIcon size={12} className="text-zinc-400" />
                                                Promedio Diario Actual:
                                            </p>
                                            <p className="mt-1 text-lg font-black text-blue-600">
                                                Q {currentDate.getMonth() === new Date().getMonth()
                                                    ? (stats.totalIncome / Math.max(new Date().getDate(), 1)).toLocaleString('es-GT', { maximumFractionDigits: 0 })
                                                    : (stats.totalIncome / endOfMonth(currentDate).getDate()).toLocaleString('es-GT', { maximumFractionDigits: 0 })
                                                } <span className="text-xs text-zinc-400 font-medium">/ día</span>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }

            {
                stats && (
                    <>
                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            {[
                                {
                                    title: `Facturado en ${MONTHS[currentDate.getMonth()]}`,
                                    value: `Q ${(stats.totalGrossIncome || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
                                    icon: DollarSign,
                                    color: 'text-zinc-600 dark:text-zinc-400',
                                    bg: 'bg-zinc-100 dark:bg-zinc-800',
                                    sub: `Ingreso total`
                                },
                                {
                                    title: `Comisionable ${MONTHS[currentDate.getMonth()]}`,
                                    value: `Q ${stats.totalIncome.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
                                    icon: DollarSign,
                                    color: 'text-blue-600',
                                    bg: 'bg-blue-50',
                                    sub: `Monto para comisiones`
                                },
                                {
                                    title: 'Procedimientos',
                                    value: stats.totalProcedures.toLocaleString('es-GT'),
                                    icon: ShoppingBag,
                                    color: 'text-green-600',
                                    bg: 'bg-green-50',
                                    sub: 'Servicios comisionables'
                                },
                                {
                                    title: 'Clientes Atendidos',
                                    value: stats.totalCustomers.toLocaleString('es-GT'),
                                    icon: Users,
                                    color: 'text-purple-600',
                                    bg: 'bg-purple-50',
                                    sub: 'Facturas procesadas'
                                },
                                {
                                    title: 'Ticket Promedio',
                                    value: `Q ${(stats.totalIncome / (stats.totalCustomers || 1)).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
                                    icon: TrendingUp,
                                    color: 'text-orange-600',
                                    bg: 'bg-orange-50',
                                    sub: 'Basado en ventas comisionables'
                                },
                            ].map((stat, i) => (
                                <Card key={i} className="border-none shadow-xl shadow-zinc-200/40 dark:shadow-none bg-white dark:bg-zinc-950 overflow-hidden relative group hover:scale-[1.02] transition-all rounded-3xl">
                                    <div className="p-6 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className={`p-2.5 rounded-xl ${stat.bg} dark:bg-zinc-900`}>
                                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Mascotas</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-0.5 text-[10px]">{stat.title}</p>
                                            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{stat.value}</p>
                                        </div>
                                        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900">
                                            <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                                                <ArrowUpRight size={14} className="text-zinc-400" />
                                                {stat.sub}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Vaccine Opportunities Banner */}
                        {stats.vaccineOpportunities > 0 && (
                            <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-3xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden group">
                                <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-12 group-hover:translate-x-6 transition-transform duration-700" />
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                                            <Activity size={32} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight">Oportunidades de Vacunación</h3>
                                            <p className="text-pink-100 font-medium max-w-lg mt-1">
                                                Detectamos <span className="font-black bg-white/20 px-2 py-0.5 rounded-lg">{stats.vaccineOpportunities} pacientes</span> atendidos este mes con vacunas vencidas o pendientes.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white text-pink-600 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wide shadow-lg hover:bg-pink-50 transition-colors cursor-pointer">
                                        Ver Pacientes
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Revenue Trend */}
                            <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-2xl font-black flex items-center gap-3">
                                        <TrendingUp className="text-blue-600" size={24} />
                                        Tendencia de Ingresos
                                    </CardTitle>
                                    <CardDescription className="font-medium">Ventas comisionables diarias para {MONTHS[currentDate.getMonth()]}</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px] pr-10 pb-8">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.revenueTrend}>
                                            <defs>
                                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 800 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 800 }}
                                                tickFormatter={(v) => `Q${v}`}
                                            />
                                            <ReTooltip
                                                contentStyle={{
                                                    borderRadius: '24px',
                                                    border: 'none',
                                                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                                                    fontWeight: '900',
                                                    padding: '12px 20px'
                                                }}
                                                formatter={(v: number) => [`Q ${v.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Ingreso']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="income"
                                                stroke="#3b82f6"
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorIncome)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Categories Mix */}
                            <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-2xl font-black flex items-center gap-3">
                                        <ShoppingBag className="text-blue-600" size={24} />
                                        Ventas por Categoría
                                    </CardTitle>
                                    <CardDescription className="font-medium">Distribución de ingresos comisionables</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px] pb-8">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie
                                                data={stats.categoryData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={90}
                                                outerRadius={130}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {stats.categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <ReTooltip
                                                contentStyle={{
                                                    borderRadius: '24px',
                                                    border: 'none',
                                                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                                                    fontWeight: '900',
                                                    padding: '12px 20px'
                                                }}
                                                formatter={(v: number) => [`Q ${v.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Total']}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle"
                                                formatter={(value) => <span className="text-xs font-black text-zinc-500 uppercase tracking-tighter">{value}</span>}
                                            />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Payment Methods */}
                            <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-2xl font-black flex items-center gap-3">
                                        <CreditCard className="text-blue-600" size={24} />
                                        Métodos de Pago
                                    </CardTitle>
                                    <CardDescription className="font-medium">Volumen comisionable por medio de cobro</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[350px] pb-10 pr-6">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.paymentMethods}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 800 }}
                                            />
                                            <YAxis axisLine={false} tickLine={false} hide />
                                            <ReTooltip
                                                cursor={{ fill: '#F9FAFB', radius: 12 }}
                                                contentStyle={{
                                                    borderRadius: '24px',
                                                    border: 'none',
                                                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                                                    fontWeight: '900'
                                                }}
                                                formatter={(v: number) => [`Q ${v.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Monto']}
                                            />
                                            <Bar dataKey="value" fill="#18181b" radius={[12, 12, 0, 0]} barSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Top Products */}
                            <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950 overflow-hidden">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-2xl font-black flex items-center gap-3">
                                        <Activity className="text-blue-600" size={24} />
                                        Top Servicios
                                    </CardTitle>
                                    <CardDescription className="font-medium">Los 5 servicios comisionables más exitosos</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                                                <tr>
                                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-zinc-400">Servicio</th>
                                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-zinc-400 text-right">Cant.</th>
                                                    <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-zinc-400 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.topProducts.map((p, i) => (
                                                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-900 group hover:bg-zinc-50/50 transition-colors">
                                                        <td className="px-8 py-6 flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">
                                                                #{i + 1}
                                                            </div>
                                                            <span className="text-sm font-black text-zinc-800 dark:text-zinc-200 truncate max-w-[150px] md:max-w-none">
                                                                {p.name}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <span className="text-xs font-black text-zinc-400">{p.count.toLocaleString('es-GT')}</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <span className="text-sm font-black text-blue-700 dark:text-blue-400">Q {p.revenue.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Species Revenue */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-2xl font-black flex items-center gap-3">
                                        <div className="text-orange-500 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-xl">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paw-print"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                                        </div>
                                        Ingresos por Especie
                                    </CardTitle>
                                    <CardDescription className="font-medium">¿Quiénes son tus mejores clientes?</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px] pb-8">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie
                                                data={stats.speciesData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={90}
                                                outerRadius={130}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {stats.speciesData.map((entry, index) => (
                                                    <Cell key={`cell-species-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <ReTooltip
                                                contentStyle={{
                                                    borderRadius: '24px',
                                                    border: 'none',
                                                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                                                    fontWeight: '900',
                                                    padding: '12px 20px'
                                                }}
                                                formatter={(v: number) => [`Q ${v.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Total']}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle"
                                                formatter={(value) => <span className="text-xs font-black text-zinc-500 uppercase tracking-tighter">{value}</span>}
                                            />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )
            }
        </div>
    )
}
