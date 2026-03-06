'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    format,
    startOfMonth,
    endOfMonth,
    setMonth,
    setYear,
    addMonths,
    subMonths
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
    PieChart as RePieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as ReTooltip,
    Legend
} from 'recharts'
import {
    PieChart,
    ChevronLeft,
    ChevronDown,
    ChevronRight,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    ArrowUpRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Invoice } from '@/types/invoices'
import { PatientAvatar } from '@/components/patients/patient-avatar'
import Link from 'next/link'

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)
const COLORS = ['#10b981', '#ef4444'] // Green for Paid, Red for Pending

interface PaymentInvoice extends Invoice {
    patient_name?: string
    patient_species?: string
    client_name?: string
    patient_data?: any
}

interface PaymentStats {
    totalBilled: number
    totalPaid: number
    totalPending: number
    fullyPaidCount: number
    partiallyPaidCount: number
    pendingInvoices: PaymentInvoice[]
}

export default function PaymentsAnalysisPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [stats, setStats] = useState<PaymentStats | null>(null)
    const [pageError, setPageError] = useState<any>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchPaymentData()
    }, [currentDate])

    async function fetchPaymentData() {
        setIsLoading(true)
        setPageError(null)
        try {
            const start = startOfMonth(currentDate)
            const end = endOfMonth(currentDate)

            // Fetch all confirmed or draft invoices in the accounting period
            const { data: invoices, error } = await supabase
                .from('invoices')
                .select('*')
                .gte('fecha_contable', format(start, 'yyyy-MM-dd'))
                .lte('fecha_contable', format(end, 'yyyy-MM-dd'))

            if (error) throw error

            let totalBilled = 0
            let totalPaid = 0
            let totalPending = 0
            let fullyPaidCount = 0
            let partiallyPaidCount = 0
            const pendingInvoices: PaymentInvoice[] = []

            invoices?.forEach(inv => {
                const total = inv.total_q || 0
                const pagado = inv.pagado_q || 0

                totalBilled += total

                // Si pagó más que el total (hubo cambio), el dinero que entró a la empresa es igual al total
                // Si pagó menos, entonces el dinero cobrado es lo que pagó
                const collected = pagado >= total ? total : pagado
                totalPaid += collected

                // Si pagó menos del total, hay deuda
                if (pagado < total) {
                    const deubt = total - pagado
                    totalPending += deubt
                    partiallyPaidCount++
                    pendingInvoices.push(inv as PaymentInvoice)
                } else {
                    fullyPaidCount++
                }
            })

            // Sort pending invoices by largest debt first
            pendingInvoices.sort((a, b) => (b.total_q - b.pagado_q) - (a.total_q - a.pagado_q))

            setStats({
                totalBilled,
                totalPaid,
                totalPending,
                fullyPaidCount,
                partiallyPaidCount,
                pendingInvoices
            })

        } catch (error: any) {
            console.error('Error fetching payments data:', error)
            setPageError(error)
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-white"></div>
            </div>
        )
    }

    const pieData = [
        { name: 'Cobrado', value: stats?.totalPaid || 0, color: COLORS[0] },
        { name: 'Pendiente', value: stats?.totalPending || 0, color: COLORS[1] }
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header / Filter Navigation */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none gap-6">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl">
                            <PieChart size={24} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
                            Análisis de Pagos
                        </h2>
                    </div>
                    <p className="text-zinc-500 font-medium text-sm">
                        Comparativa de facturas Canceladas Totalmente vs Parcialmente.
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
                        onClick={fetchPaymentData}
                        className="h-9 w-9 rounded-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : 'text-zinc-500'}`} />
                    </Button>
                </div>
            </div>

            {pageError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-3xl">
                    <h3 className="font-bold mb-2">Error al cargar datos:</h3>
                    <pre className="text-xs break-words whitespace-pre-wrap">{JSON.stringify(pageError, null, 2)}</pre>
                </div>
            )}

            {
                stats && (
                    <>
                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="border-none shadow-xl shadow-zinc-200/40 dark:shadow-none bg-white dark:bg-zinc-950 overflow-hidden relative group hover:scale-[1.02] transition-all rounded-3xl">
                                <div className="p-6 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900`}>
                                            <DollarSign className={`h-5 w-5 text-zinc-600 dark:text-zinc-400`} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-0.5 text-[10px]">Total Facturado</p>
                                        <p className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Q {stats.totalBilled.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="border-none shadow-xl shadow-zinc-200/40 dark:shadow-none bg-emerald-50 dark:bg-emerald-950/20 overflow-hidden relative group hover:scale-[1.02] transition-all rounded-3xl">
                                <div className="p-6 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50`}>
                                            <CheckCircle2 className={`h-5 w-5 text-emerald-600`} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50">Cobrado</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-0.5 text-[10px]">Cancelado Totalmente</p>
                                        <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">Q {stats.totalPaid.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="pt-3 border-t border-emerald-200 dark:border-emerald-900/50 flex justify-between">
                                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500">{stats.fullyPaidCount} facturas</p>
                                        <p className="text-[10px] font-black text-emerald-700">{stats.totalBilled > 0 ? ((stats.totalPaid / stats.totalBilled) * 100).toFixed(1) : 0}% de retención</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="border-none shadow-xl shadow-zinc-200/40 dark:shadow-none bg-red-50 dark:bg-red-950/20 overflow-hidden relative group hover:scale-[1.02] transition-all rounded-3xl">
                                <div className="p-6 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2.5 rounded-xl bg-red-100 dark:bg-red-900/50`}>
                                            <AlertCircle className={`h-5 w-5 text-red-600`} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600/50">Pendiente</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-red-600 mb-0.5 text-[10px]">Cancelado Parcialmente</p>
                                        <p className="text-3xl font-black text-red-700 dark:text-red-400 tracking-tight">Q {stats.totalPending.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="pt-3 border-t border-red-200 dark:border-red-900/50 flex justify-between">
                                        <p className="text-[10px] font-bold text-red-600 dark:text-red-500">{stats.partiallyPaidCount} facturas</p>
                                        <p className="text-[10px] font-black text-red-700">{stats.totalBilled > 0 ? ((stats.totalPending / stats.totalBilled) * 100).toFixed(1) : 0}% en la calle</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Analysis Body */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Graphic Component */}
                            <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950 col-span-1">
                                <CardHeader className="p-8 pb-0">
                                    <CardTitle className="text-xl font-black flex items-center gap-3">
                                        Resumen Visual
                                    </CardTitle>
                                    <CardDescription className="font-medium">Distribución de los cobros versus facturación</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[350px] pb-8 pt-6">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={120}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-pay-${index}`} fill={entry.color} stroke="none" />
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
                                                formatter={(v: number) => [`Q ${v.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Monto']}
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

                            {/* Table of non-paid invoices */}
                            <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950 col-span-1 lg:col-span-2 overflow-hidden flex flex-col">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-xl font-black flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="text-red-500" />
                                            Deudores (Cancelado Parcialmente)
                                        </div>
                                        <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs px-3 py-1 rounded-full">{stats.partiallyPaidCount} Pendientes</span>
                                    </CardTitle>
                                    <CardDescription className="font-medium">Lista de facturas con saldos por cobrar.</CardDescription>
                                </CardHeader>

                                <div className="flex-1 overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-100 dark:border-zinc-800">
                                            <tr>
                                                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-zinc-400">Paciente</th>
                                                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-zinc-400">Cliente</th>
                                                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-zinc-400">Facturado</th>
                                                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-zinc-400">Abonado</th>
                                                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-red-500 text-right">Deuda</th>
                                                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-transparent">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.pendingInvoices.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center justify-center space-y-3">
                                                            <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 p-4 rounded-full">
                                                                <CheckCircle2 size={32} />
                                                            </div>
                                                            <div className="text-zinc-900 dark:text-zinc-100 font-bold">¡Felicidades! No hay deudas.</div>
                                                            <p className="text-zinc-500 text-sm">Todas las facturas del mes están canceladas totalmente.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                stats.pendingInvoices.map((inv) => {
                                                    let patientDataArray = Array.isArray(inv.patient_data) ? inv.patient_data : (inv.patient_data ? [inv.patient_data] : [])
                                                    const primaryPatient = patientDataArray.length > 0 ? patientDataArray[0] : null
                                                    const deubt = inv.total_q - inv.pagado_q

                                                    return (
                                                        <tr key={inv.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="relative">
                                                                        <PatientAvatar
                                                                            id_animal={primaryPatient?.id_animal}
                                                                            especie={primaryPatient?.especie || inv.patient_species || 'otro'}
                                                                            size="sm"
                                                                            className="h-10 w-10 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                                                                        />
                                                                        {patientDataArray.length > 1 && (
                                                                            <div className="absolute -bottom-1 -right-1 bg-zinc-900 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                                                                                +{patientDataArray.length - 1}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                                                                            {inv.patient_name}
                                                                        </span>
                                                                        <span className="text-xs text-zinc-500 font-medium truncate">
                                                                            TKT #{inv.ticket_numero}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300 block truncate max-w-[150px]">
                                                                    {inv.client_name || 'Venta Rápida'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                                                    Q {inv.total_q.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-500">
                                                                    Q {inv.pagado_q.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="font-black text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                                                                    Q {deubt.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <Link href={`/dashboard/records?ticket=${inv.ticket_numero}`}>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                                        <ArrowUpRight size={16} />
                                                                    </Button>
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </>
                )
            }
        </div>
    )
}
