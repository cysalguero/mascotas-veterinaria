'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    format,
    startOfMonth,
    endOfMonth,
    setMonth,
    setYear,
} from 'date-fns'
import {
    FileSpreadsheet,
    DollarSign,
    Briefcase,
    TrendingUp,
    Save,
    Calculator,
    CheckCircle2,
    RefreshCw,
    Wallet,
    ChevronDown,
    CreditCard,
    Edit3,
    Lock,
    Trophy
} from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

export default function SettlementsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [commissionableIncome, setCommissionableIncome] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const [internalDoctorId, setInternalDoctorId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<'admin' | 'doctor' | null>(null)
    const [isCheckingRole, setIsCheckingRole] = useState(true)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [hasExisting, setHasExisting] = useState(false)

    const DOCTOR_NAME = "Dra. Natalia Reyes Useche"

    // Calculation State
    const [workDays, setWorkDays] = useState<number | string>(30)
    const [totalDaysInMonth, setTotalDaysInMonth] = useState(30)
    const [baseSalaryUsd, setBaseSalaryUsd] = useState(500)
    const [exchangeRate, setExchangeRate] = useState(7.5)
    const [paymentMethod, setPaymentMethod] = useState('Efectivo')

    const supabase = createClient()

    useEffect(() => {
        // Obtenemos el ID técnico necesario y verificamos rol con lógica blindada
        async function fetchInitialData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const email = user.email || ''
                setInternalDoctorId(user.id)

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

                // 3. Override por Email
                const adminEmails = ['cysalguero@gmail.com', 'sergiounah@gmail.com']
                if (adminEmails.includes(email.toLowerCase())) {
                    role = 'admin'
                }

                setUserRole((role as 'admin' | 'doctor') || 'doctor')
            }
            setIsCheckingRole(false)
        }
        fetchInitialData()
    }, [])

    useEffect(() => {
        fetchCommissionableData()
        checkExistingSettlement()
        const end = endOfMonth(currentDate)
        const daysInMonth = parseInt(format(end, 'd'))
        setTotalDaysInMonth(daysInMonth)
        // Solo actualizamos workDays si no está bloqueado (registro nuevo)
    }, [currentDate])

    async function checkExistingSettlement() {
        try {
            const { data } = await supabase
                .from('settlements')
                .select('*')
                .eq('mes', currentDate.getMonth())
                .eq('anio', currentDate.getFullYear())
                .maybeSingle()

            if (data) {
                setWorkDays(data.dias_trabajados)
                setBaseSalaryUsd(data.sueldo_base_usd)
                setExchangeRate(data.tipo_cambio)
                setPaymentMethod(data.metodo_pago || 'Transferencia')
                setIsLocked(true)
                setHasExisting(true)
            } else {
                const end = endOfMonth(currentDate)
                setWorkDays(parseInt(format(end, 'd')))
                setIsLocked(false)
                setHasExisting(false)
            }
        } catch (error) {
            console.error('Error checking existing settlement:', error)
        }
    }

    async function fetchCommissionableData() {
        setIsLoading(true)
        try {
            const start = startOfMonth(currentDate)
            const end = endOfMonth(currentDate)

            // Buscamos todas las ventas comisionables del mes
            const { data, error } = await supabase
                .from('invoice_items')
                .select('total_q, invoices!inner(fecha_venta)')
                .eq('comisionable', true)
                .gte('invoices.fecha_venta', format(start, 'yyyy-MM-dd'))
                .lte('invoices.fecha_venta', format(end, 'yyyy-MM-dd'))

            if (error) throw error

            const total = data.reduce((acc, item) => acc + (item.total_q || 0), 0)
            setCommissionableIncome(total)
        } catch (error) {
            console.error('Error fetching commission data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleSaveSettlement() {
        setIsSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Si no tenemos un ID de doctor, buscamos el primero que exista para no fallar
            let idToUse = internalDoctorId
            if (!idToUse) {
                const { data } = await supabase.from('profiles').select('id').limit(1).maybeSingle()
                idToUse = data?.id || user?.id // Fallback final al admin si no hay doctores
            }

            const settlementData: any = {
                doctor_id: idToUse,
                mes: currentDate.getMonth(),
                anio: currentDate.getFullYear(),
                dias_trabajados: daysWorkedNum,
                total_dias_mes: totalDaysInMonth,
                sueldo_base_usd: baseSalaryUsd,
                sueldo_proporcional_usd: proratedSalaryUsd,
                ingresos_comisionables_q: commissionableIncome,
                comision_quetzales: commissionQuetzales,
                tipo_cambio: exchangeRate,
                total_usd: totalToPayUsd,
                total_quetzales: totalToPayQuetzales,
                alcanzo_meta: hasReachedGoal,
                bono_meta_usd: metaBonusUsd,
                estado: 'Completado',
                metodo_pago: paymentMethod
            }

            const { error } = await supabase
                .from('settlements')
                .upsert(settlementData, {
                    onConflict: 'doctor_id, mes, anio'
                })

            if (error) throw error

            setIsSuccess(true)
            setIsLocked(true)
            setHasExisting(true)
            setTimeout(() => setIsSuccess(false), 3000)
            alert('¡Cierre mensual registrado con éxito! ✅')
        } catch (error: any) {
            console.error('Error detailed:', error)
            const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
            alert(`Error al guardar cierre: ${errorMsg}`)
        } finally {
            setIsSaving(false)
        }
    }

    const daysWorkedNum = typeof workDays === 'string' ? (parseInt(workDays) || 0) : workDays
    const proratedSalaryUsd = (baseSalaryUsd / totalDaysInMonth) * daysWorkedNum
    const commissionQuetzales = commissionableIncome * 0.05
    const commissionUsd = commissionQuetzales / exchangeRate

    // --- LÓGICA DE META MENSUAL (Q30,000 de Ventas) ---
    const hasReachedGoal = commissionableIncome >= 30000
    const metaBonusUsd = hasReachedGoal ? 100 : 0
    // --------------------------------------------------

    const totalToPayUsd = proratedSalaryUsd + commissionUsd + metaBonusUsd
    const totalToPayQuetzales = (totalToPayUsd * exchangeRate)

    if (isCheckingRole) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
                <p className="text-zinc-500 font-medium italic">Verificando credenciales...</p>
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
                        Lo sentimos, no tienes los permisos necesarios para gestionar los cierres mensuales.
                    </p>
                </div>
                <Button
                    onClick={() => window.location.href = '/dashboard/metrics'}
                    className="h-14 px-8 bg-zinc-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-zinc-200"
                >
                    Volver al Dashboard
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none gap-6">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl">
                            <FileSpreadsheet size={24} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
                            Cierre Mensual
                        </h2>
                    </div>
                    <p className="text-zinc-500 font-medium text-sm">
                        {DOCTOR_NAME} • {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-1 border border-zinc-100 dark:border-zinc-800">
                        <div className="relative group px-2">
                            <select
                                value={currentDate.getMonth()}
                                onChange={(e) => setCurrentDate(setMonth(currentDate, parseInt(e.target.value)))}
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
                                onChange={(e) => setCurrentDate(setYear(currentDate, parseInt(e.target.value)))}
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
                        size="icon"
                        onClick={fetchCommissionableData}
                        className="rounded-2xl h-11 w-11"
                    >
                        <RefreshCw className={`h-5 w-5 ${isLoading || isSaving ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-xl shadow-zinc-200/40 dark:shadow-none bg-white dark:bg-zinc-950 rounded-[32px] overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black flex items-center gap-3">
                                <Calculator className="text-blue-600" size={20} />
                                Parámetros {isLocked && <Lock size={16} className="text-zinc-400" />}
                            </CardTitle>
                            <CardDescription>Ajusta los valores para el cálculo</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Días Trabajados</Label>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            value={workDays}
                                            disabled={isLocked}
                                            onChange={(e) => setWorkDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                                            onFocus={(e) => e.target.select()}
                                            className="h-12 rounded-2xl font-black text-lg border-zinc-100 bg-zinc-50 focus-visible:ring-blue-500 disabled:opacity-50"
                                        />
                                        <span className="text-sm font-bold text-zinc-400 whitespace-nowrap">de {totalDaysInMonth} días</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sueldo Base (USD)</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                        <Input
                                            type="number"
                                            value={baseSalaryUsd}
                                            disabled={isLocked}
                                            onChange={(e) => setBaseSalaryUsd(parseFloat(e.target.value) || 0)}
                                            className="h-12 pl-10 rounded-2xl font-black text-lg border-zinc-100 bg-zinc-50 focus-visible:ring-blue-500 disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tipo de Cambio (Q/$)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={exchangeRate}
                                        disabled={isLocked}
                                        onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                                        className="h-12 rounded-2xl font-black text-lg border-zinc-100 bg-zinc-50 focus-visible:ring-blue-500 disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Método de Pago</Label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                        <select
                                            value={paymentMethod}
                                            disabled={isLocked}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full h-12 pl-10 pr-4 rounded-2xl font-black text-lg border-zinc-100 bg-zinc-50 border-none focus:ring-0 focus:outline-none appearance-none disabled:opacity-50 cursor-pointer"
                                        >
                                            <option value="Transferencia">Transferencia</option>
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Cheque">Cheque</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
                                <p className="text-[11px] font-medium text-zinc-500 italic">
                                    {isLocked ? (
                                        <span className="text-zinc-900 dark:text-zinc-100 font-bold">Registro bloqueado. Haz clic en Editar para modificar.</span>
                                    ) : (
                                        "* El cálculo del sueldo base es proporcional."
                                    )}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-xl shadow-zinc-200/40 dark:shadow-none bg-blue-600 rounded-[32px] overflow-hidden text-white">
                        <CardContent className="p-8 space-y-4 text-center">
                            <Wallet className="h-12 w-12 mx-auto opacity-50 mb-2" />
                            <h3 className="text-xl font-black tracking-tight">Ventas Comisionables</h3>
                            <p className="text-3xl font-black">Q {commissionableIncome.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Detectadas para este mes</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-none shadow-2xl shadow-zinc-200/40 dark:shadow-none bg-white dark:bg-zinc-950 rounded-[40px] overflow-hidden relative">
                        <div className="absolute top-8 left-10">
                            {hasExisting ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <CheckCircle2 size={12} /> Registrado
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <Calculator size={12} /> Pendiente
                                </span>
                            )}
                        </div>
                        <div className="absolute top-0 right-0 p-8">
                            <CheckCircle2 className="text-green-500 h-12 w-12 opacity-10" />
                        </div>

                        <CardHeader className="p-10 pb-0 text-center">
                            <CardTitle className="text-3xl font-black tracking-tighter">Resumen de Liquidación</CardTitle>
                            <CardDescription className="text-base font-medium">{DOCTOR_NAME} • {MONTHS[currentDate.getMonth()]}</CardDescription>
                        </CardHeader>

                        <CardContent className="p-10 space-y-10">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900 rounded-3xl group transition-all hover:bg-zinc-100/50">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-sm">
                                            <Briefcase className="text-zinc-500" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tighter">Sueldo Base Proporcional</p>
                                            <p className="text-xs font-bold text-zinc-400">Ajustado a {daysWorkedNum} días</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">$ {proratedSalaryUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-xs font-bold text-zinc-400">Q {(proratedSalaryUsd * exchangeRate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900 rounded-3xl group transition-all hover:bg-zinc-100/50">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-sm">
                                            <TrendingUp className="text-blue-600" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Comisiones (5%)</p>
                                            <p className="text-xs font-bold text-zinc-400">Sobre Q {commissionableIncome.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-blue-700 dark:text-blue-400">$ {commissionUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-xs font-bold text-zinc-400">Q {commissionQuetzales.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                {hasReachedGoal && (
                                    <div className="flex items-center justify-between p-6 bg-green-50 dark:bg-green-900/20 rounded-3xl border border-green-100 dark:border-green-900/30 animate-in zoom-in duration-500">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-white dark:bg-green-900/50 rounded-2xl flex items-center justify-center shadow-sm">
                                                <Trophy className="text-green-600 dark:text-green-400" size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-green-700 dark:text-green-400 uppercase tracking-tighter">Bono por Meta Alcanzada</p>
                                                <p className="text-xs font-bold text-green-600/70 italic">¡Felicidades! Meta de Q30,000 superada</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-green-700 dark:text-green-400">+$ {metaBonusUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            <p className="text-xs font-bold text-green-600/50">Q {(metaBonusUsd * exchangeRate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-zinc-900 dark:bg-white rounded-[32px] p-10 text-white dark:text-zinc-900 flex flex-col items-center justify-center gap-2 shadow-2xl shadow-blue-500/20">
                                <p className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Total Neto a Liquidar</p>
                                <h4 className="text-6xl font-black tracking-tighter italic">
                                    $ {totalToPayUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </h4>
                                <div className="h-px w-24 bg-white/20 dark:bg-zinc-200 my-2" />
                                <p className="text-2xl font-black text-blue-400 dark:text-blue-600">
                                    Q {totalToPayQuetzales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                                {isLocked ? (
                                    <Button
                                        onClick={() => setIsLocked(false)}
                                        className="w-full h-16 rounded-[24px] text-lg font-black shadow-xl transition-all bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                                    >
                                        <Edit3 className="mr-3 h-5 w-5" />
                                        Habilitar Edición
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleSaveSettlement}
                                        disabled={isSaving}
                                        className={`w-full h-16 rounded-[24px] text-lg font-black shadow-xl transition-all ${isSuccess
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
                                            }`}
                                    >
                                        {isSaving ? (
                                            <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
                                        ) : isSuccess ? (
                                            <CheckCircle2 className="mr-3 h-5 w-5" />
                                        ) : (
                                            <Save className="mr-3 h-5 w-5" />
                                        )}
                                        {isSaving ? 'Guardando...' : isSuccess ? '¡Registrado!' : hasExisting ? 'Actualizar Registro' : 'Registrar Cierre Mensual'}
                                    </Button>
                                )}
                                <Button variant="outline" className="w-full h-16 rounded-[24px] border-zinc-200 dark:border-zinc-800 text-lg font-black hover:bg-zinc-50 transition-all">
                                    <FileSpreadsheet className="mr-3 h-5 w-5" />
                                    Exportar Resumen
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
