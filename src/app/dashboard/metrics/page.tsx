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
    Search
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
    totalIncome: number
    totalCommission: number
    totalProcedures: number
    totalCustomers: number
    categoryData: { name: string, value: number, color: string }[]
    revenueTrend: { date: string, income: number }[]
    paymentMethods: { name: string, value: number }[]
    topProducts: { name: string, count: number, revenue: number }[]
    prevMonthIncome: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']
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

            let totalIncome = 0
            let totalProcedures = 0
            const customersCount = invoices.length
            const categoryMap: Record<string, number> = {}
            const paymentMap: Record<string, number> = {}
            const productsMap: Record<string, { count: number, revenue: number }> = {}

            // Process Trend for the current viewing month
            const monthDays = eachDayOfInterval({ start, end })
            const trendMap: Record<string, number> = {}
            monthDays.forEach(day => {
                trendMap[format(day, 'yyyy-MM-dd')] = 0
            })

            invoices.forEach(inv => {
                // Payment Methods and Trend use total invoice value for visualization normally,
                // but user said "Ingresos al mes son SOLO COMISIONABLES". 
                // Let's decide if charts should also reflect only commissionable or the whole volume.
                // For "Tendencia de Ingresos" and "Ventas por Categoría", it makes sense to follow the same rule as "Total Income".

                let invoiceCommissionableTotal = 0

                inv.invoice_items?.forEach((item: any) => {
                    const itemTotal = item.total_q || 0

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
                prevMonthIncome
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

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
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

                    <Button
                        variant="outline"
                        size="icon-lg"
                        onClick={fetchDashboardData}
                        className="rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                    >
                        <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin text-blue-600' : 'text-zinc-500'}`} />
                    </Button>
                </div>
            </div>

            {/* Monthly Goal Progress Bar */}
            {stats && (
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
                                        {stats.totalIncome >= 30000
                                            ? "¡Felicidades! Has alcanzado la meta y ganado tu bono de $100 USD 🥳"
                                            : `Te faltan Q ${(30000 - stats.totalIncome).toLocaleString('es-GT', { minimumFractionDigits: 2 })} para obtener tu bonificación de $100 USD.`
                                        }
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                                        Q {stats.totalIncome.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-sm font-black text-zinc-400 ml-2 italic">de Q 30,000.00</span>
                                </div>
                            </div>

                            <div className="relative h-4 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                    className={`absolute left-0 top-0 h-full transition-all duration-1000 ease-out rounded-full ${stats.totalIncome >= 30000
                                        ? "bg-gradient-to-r from-green-400 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                        : "bg-gradient-to-r from-blue-500 to-blue-700"
                                        }`}
                                    style={{ width: `${Math.min((stats.totalIncome / 30000) * 100, 100)}%` }}
                                />
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                <span>0%</span>
                                <span>{((stats.totalIncome / 30000) * 100).toFixed(1)}% COMPLETADO</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="lg:col-span-1 border-none shadow-xl shadow-zinc-200/40 dark:shadow-none bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group">
                        <div className="absolute -right-4 -top-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform text-zinc-900 dark:text-white">
                            <Activity size={120} />
                        </div>
                        <div className="space-y-4 relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rendimiento vs Mes Anterior</p>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-zinc-500">Diferencia Total</p>
                                <div className="flex items-center gap-3">
                                    <h4 className={`text-4xl font-black ${(stats.totalIncome - stats.prevMonthIncome) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {(stats.totalIncome - stats.prevMonthIncome).toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' })}
                                    </h4>
                                    {(stats.totalIncome - stats.prevMonthIncome) >= 0 ? <ArrowUpRight className="text-green-600" /> : <ArrowDownRight className="text-red-600" />}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
                                <p className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                    <CalendarIcon size={12} className="text-zinc-400" />
                                    Cierre Mes Anterior: <span className="text-zinc-900 dark:text-zinc-100 font-black">Q {stats.prevMonthIncome.toLocaleString('es-GT')}</span>
                                </p>
                                <p className={`mt-2 text-sm font-black ${((stats.totalIncome / (stats.prevMonthIncome || 1)) - 1) * 100 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {(((stats.totalIncome / (stats.prevMonthIncome || 1)) - 1) * 100).toFixed(1)}% {((stats.totalIncome / (stats.prevMonthIncome || 1)) - 1) * 100 >= 0 ? 'de Crecimiento' : 'de Descenso'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {stats && (
                <>
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                title: `Ingresos ${MONTHS[currentDate.getMonth()]}`,
                                value: `Q ${stats.totalIncome.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
                                icon: DollarSign,
                                color: 'text-blue-600',
                                bg: 'bg-blue-50',
                                sub: `Comisión (5%): Q ${stats.totalCommission.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
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
                </>
            )}
        </div>
    )
}
