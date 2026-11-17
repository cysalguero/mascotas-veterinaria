'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    User,
    Mail,
    Shield,
    ShieldCheck,
    Save,
    RefreshCw,
    Calendar,
    Clock,
    LockOpen,
    CheckCircle,
    Trash2,
    Plus,
    Database,
    Key,
    Utensils,
    Car,
    Wallet,
} from 'lucide-react'
import {
    ALLOWANCES_START_YEAR,
    calculateSettlementTotals,
    DEFAULT_SETTLEMENT_ALLOWANCES,
    getAllowanceMonthKey,
    getAllowancesForMonth,
    normalizeAllowancesConfig,
    round2,
    SETTLEMENT_ALLOWANCES_KEY,
    SettlementAllowancesConfig,
} from '@/lib/settlements'

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const ALLOWANCE_YEARS = Array.from(
    { length: Math.max(3, new Date().getFullYear() - ALLOWANCES_START_YEAR + 3) },
    (_, i) => ALLOWANCES_START_YEAR + i
)

// Interface for Override Windows array
interface OverrideWindow {
    id: string;
    allowed_date: string;
    expires_at: string;
}

export default function SettingsPage() {
    const supabase = createClient()
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [fullName, setFullName] = useState('')

    // Admin Settings State
    const [overrideWindows, setOverrideWindows] = useState<OverrideWindow[]>([])
    const [newAllowedDate, setNewAllowedDate] = useState('')
    const [isSavingAdmin, setIsSavingAdmin] = useState(false)
    const [adminMessage, setAdminMessage] = useState({ text: '', type: '' })
    const [selectedDuration, setSelectedDuration] = useState('1') // default 1 hour

    // SIGES API Config State
    const [sigesUrl, setSigesUrl] = useState('http://feltestapi.globalsistec.com')
    const [sigesApiKey, setSigesApiKey] = useState('')
    const [sigesWebhookSecret, setSigesWebhookSecret] = useState('')
    const [isSavingSiges, setIsSavingSiges] = useState(false)
    const [sigesMessage, setSigesMessage] = useState({ text: '', type: '' })

    // Tabs & Cierre Mensual (Comida / Transporte) Config State
    const [activeTab, setActiveTab] = useState('profile')
    const [allowancesConfig, setAllowancesConfig] = useState<SettlementAllowancesConfig>(DEFAULT_SETTLEMENT_ALLOWANCES)
    const [defaultFoodQ, setDefaultFoodQ] = useState<number>(750)
    const [defaultTransportQ, setDefaultTransportQ] = useState<number>(250)
    const [selectedAllowanceMonth, setSelectedAllowanceMonth] = useState<number>(new Date().getMonth())
    const [selectedAllowanceYear, setSelectedAllowanceYear] = useState<number>(Math.max(ALLOWANCES_START_YEAR, new Date().getFullYear()))
    const [monthFoodQ, setMonthFoodQ] = useState<number>(750)
    const [monthTransportQ, setMonthTransportQ] = useState<number>(250)
    const [existingMonthSettlement, setExistingMonthSettlement] = useState<{ id: string } | null>(null)
    const [isSavingAllowances, setIsSavingAllowances] = useState(false)
    const [allowancesMessage, setAllowancesMessage] = useState({ text: '', type: '' })

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                const email = user.email || ''
                let role = user.app_metadata?.role || user.user_metadata?.role

                // Intento primario: Buscar por ID (Relación oficial)
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, role, email')
                    .eq('id', user.id)
                    .maybeSingle()

                if (profileError) {
                    console.error('Error al consultar perfil por ID:', profileError.message, profileError.details, profileError.hint)
                }

                let finalProfile = profileData

                // Intento secundario: Buscar por Email (Si el ID no coincide por alguna razón)
                if (!finalProfile && email) {
                    const { data: profileByEmail, error: emailError } = await supabase
                        .from('profiles')
                        .select('full_name, role, email')
                        .eq('email', email)
                        .maybeSingle()

                    if (emailError) {
                        console.error('Error al consultar perfil por Email:', emailError.message, emailError.details, emailError.hint)
                    }
                    finalProfile = profileByEmail
                }

                if (finalProfile) {
                    setProfile(finalProfile)
                    setFullName(finalProfile.full_name || '')
                    if (!role) role = finalProfile.role
                } else {
                    // Fallback: Si no hay perfil en la tabla 'public.profiles', usar metadata de Auth
                    const metaName = user.user_metadata?.full_name || user.user_metadata?.name
                    setFullName(metaName || '')
                }

                // Definir rol final (Prioridad: DB -> Metadata -> Email Override)
                const adminEmails = ['cysalguero@gmail.com', 'sergiounah@gmail.com']
                const finalRole = adminEmails.includes(email.toLowerCase()) ? 'admin' : (role || 'doctor')

                setProfile((prev: any) => ({ ...prev, role: finalRole }))

                // Si es admin, cargar la configuracion
                if (finalRole === 'admin') {
                    const { data: settingsData } = await supabase
                        .from('app_settings')
                        .select('value')
                        .eq('key', 'invoice_date_override')
                        .maybeSingle()
                    
                    if (settingsData && settingsData.value) {
                        let windows: OverrideWindow[] = []
                        if (Array.isArray(settingsData.value)) {
                            windows = settingsData.value
                        } else if (settingsData.value.active && settingsData.value.expires_at) {
                            // Retrocompatibilidad con la version vieja (objeto simple)
                            windows = [{
                                id: crypto.randomUUID(),
                                allowed_date: settingsData.value.allowed_date,
                                expires_at: settingsData.value.expires_at
                            }]
                        }

                        // SILENT AUTO-CLEANUP: Eliminar ventanas expiradas al cargar la página
                        const cleanWindows = windows.filter(w => new Date() < new Date(w.expires_at))
                        setOverrideWindows(cleanWindows)

                        if (cleanWindows.length !== windows.length) {
                            supabase.from('app_settings').update({ value: cleanWindows }).eq('key', 'invoice_date_override').then()
                        }
                    }

                    // Cargar configuración de SIGES y viáticos de Cierre Mensual
                    const [{ data: sigesData }, { data: allowancesRow }] = await Promise.all([
                        supabase
                            .from('app_settings')
                            .select('key, value')
                            .in('key', ['siges_api_url', 'siges_api_key', 'siges_webhook_secret']),
                        supabase
                            .from('app_settings')
                            .select('value')
                            .eq('key', SETTLEMENT_ALLOWANCES_KEY)
                            .maybeSingle()
                    ])

                    if (sigesData) {
                        sigesData.forEach(setting => {
                            if (setting.key === 'siges_api_url') setSigesUrl(setting.value?.trim() || 'http://feltestapi.globalsistec.com')
                            if (setting.key === 'siges_api_key') setSigesApiKey(setting.value || '')
                            if (setting.key === 'siges_webhook_secret') setSigesWebhookSecret(setting.value || '')
                        })
                    }

                    const normalizedAllowances = normalizeAllowancesConfig(allowancesRow?.value)
                    setAllowancesConfig(normalizedAllowances)
                    setDefaultFoodQ(normalizedAllowances.defaults.comida_q)
                    setDefaultTransportQ(normalizedAllowances.defaults.transporte_q)

                    const tabParam = new URLSearchParams(window.location.search).get('tab')
                    if (tabParam === 'settlements' || tabParam === 'admin' || tabParam === 'profile') {
                        setActiveTab(tabParam)
                    }
                }
            }
            setIsLoading(false)
        }
        loadProfile()
    }, [])

    useEffect(() => {
        if (profile?.role !== 'admin') return
        let isMounted = true

        async function loadMonthAllowanceStatus() {
            const configured = getAllowancesForMonth(allowancesConfig, selectedAllowanceYear, selectedAllowanceMonth)
            const { data } = await supabase
                .from('settlements')
                .select('*')
                .eq('mes', selectedAllowanceMonth)
                .eq('anio', selectedAllowanceYear)
                .maybeSingle()

            if (!isMounted) return
            setExistingMonthSettlement(data || null)
            if (data) {
                setMonthFoodQ(
                    data.comida_mes_siguiente_q !== undefined && data.comida_mes_siguiente_q !== null
                        ? Number(data.comida_mes_siguiente_q)
                        : configured.comida_q
                )
                setMonthTransportQ(
                    data.auxilio_transporte_q !== undefined && data.auxilio_transporte_q !== null
                        ? Number(data.auxilio_transporte_q)
                        : configured.transporte_q
                )
            } else {
                setMonthFoodQ(configured.comida_q)
                setMonthTransportQ(configured.transporte_q)
            }
        }

        loadMonthAllowanceStatus()
        return () => { isMounted = false }
    }, [profile?.role, selectedAllowanceMonth, selectedAllowanceYear, allowancesConfig])

    const handleAddWindow = async () => {
        setIsSavingAdmin(true)
        setAdminMessage({ text: '', type: '' })
        try {
            if (!newAllowedDate) {
                throw new Error('Debes seleccionar una fecha permitida para habilitar el permiso.')
            }
            if (overrideWindows.some(w => w.allowed_date === newAllowedDate)) {
                throw new Error('Esta fecha ya tiene un permiso activo.')
            }

            const date = new Date()
            date.setHours(date.getHours() + parseInt(selectedDuration))

            const newWindow: OverrideWindow = {
                id: crypto.randomUUID(),
                allowed_date: newAllowedDate,
                expires_at: date.toISOString()
            }

            const updatedWindows = [...overrideWindows, newWindow]

            const { error } = await supabase
                .from('app_settings')
                .update({ value: updatedWindows })
                .eq('key', 'invoice_date_override')
            
            if (error) throw error

            setOverrideWindows(updatedWindows)
            setNewAllowedDate('')
            setAdminMessage({ text: 'Permiso temporal añadido exitosamente.', type: 'success' })
        } catch (error: any) {
            setAdminMessage({ text: error.message || 'Error al guardar.', type: 'error' })
        } finally {
            setIsSavingAdmin(false)
        }
    }

    const handleDeleteWindow = async (id: string) => {
        setAdminMessage({ text: '', type: '' })
        try {
            const updatedWindows = overrideWindows.filter(w => w.id !== id)
            const { error } = await supabase
                .from('app_settings')
                .update({ value: updatedWindows })
                .eq('key', 'invoice_date_override')
            
            if (error) throw error

            setOverrideWindows(updatedWindows)
            setAdminMessage({ text: 'Permiso revocado.', type: 'success' })
        } catch (error: any) {
            setAdminMessage({ text: error.message || 'Error al eliminar.', type: 'error' })
        }
    }

    const handleSaveSigesConfig = async () => {
        setIsSavingSiges(true)
        setSigesMessage({ text: '', type: '' })
        try {
            // Check if settings keys exist, if doing upsert we need them.
            // Using a simple upsert per key
            const keysToUpdate = [
                { key: 'siges_api_url', value: sigesUrl },
                { key: 'siges_api_key', value: sigesApiKey },
                { key: 'siges_webhook_secret', value: sigesWebhookSecret }
            ];

            for (const item of keysToUpdate) {
                // Upsert behavior using raw match or eq
                const { data: existing } = await supabase.from('app_settings').select('id').eq('key', item.key).maybeSingle();
                if (existing) {
                    await supabase.from('app_settings').update({ value: item.value }).eq('key', item.key);
                } else {
                    await supabase.from('app_settings').insert([{ key: item.key, value: item.value }]);
                }
            }

            setSigesMessage({ text: 'Configuración SIGES guardada exitosamente.', type: 'success' })
        } catch (error: any) {
            setSigesMessage({ text: error.message || 'Error al guardar.', type: 'error' })
        } finally {
            setIsSavingSiges(false)
        }
    }



    const persistAllowancesConfig = async (nextConfig: SettlementAllowancesConfig) => {
        const { data: existing } = await supabase
            .from('app_settings')
            .select('id')
            .eq('key', SETTLEMENT_ALLOWANCES_KEY)
            .maybeSingle()

        if (existing) {
            const { error } = await supabase
                .from('app_settings')
                .update({ value: nextConfig })
                .eq('key', SETTLEMENT_ALLOWANCES_KEY)
            if (error) throw error
        } else {
            const { error } = await supabase
                .from('app_settings')
                .insert([{ key: SETTLEMENT_ALLOWANCES_KEY, value: nextConfig }])
            if (error) throw error
        }
    }

    const syncSettlementRowIfExists = async (year: number, month: number, foodQ: number, transportQ: number) => {
        const { data: existingRow, error: fetchError } = await supabase
            .from('settlements')
            .select('*')
            .eq('mes', month)
            .eq('anio', year)
            .maybeSingle()

        if (fetchError) throw fetchError
        if (!existingRow) return false

        const calc = calculateSettlementTotals({
            baseSalaryUsd: Number(existingRow.sueldo_base_usd || 0),
            daysWorked: Number(existingRow.dias_trabajados || 0),
            totalDaysInMonth: Number(existingRow.total_dias_mes || 30),
            commissionableIncomeQ: Number(existingRow.ingresos_comisionables_q || 0),
            exchangeRate: Number(existingRow.tipo_cambio || 7.5),
            foodAllowanceQ: foodQ,
            transportAllowanceQ: transportQ,
        })

        const { error: updateError } = await supabase
            .from('settlements')
            .update({
                comida_mes_siguiente_q: calc.foodQ,
                auxilio_transporte_q: calc.transportQ,
                total_quetzales: calc.totalQuetzales,
                total_usd: calc.totalUsd,
            })
            .eq('id', existingRow.id)

        if (updateError) throw updateError
        return true
    }

    const handleSaveDefaultAllowances = async () => {
        setIsSavingAllowances(true)
        setAllowancesMessage({ text: '', type: '' })
        try {
            const nextConfig: SettlementAllowancesConfig = {
                ...allowancesConfig,
                defaults: {
                    comida_q: round2(Math.max(0, defaultFoodQ)),
                    transporte_q: round2(Math.max(0, defaultTransportQ)),
                },
            }
            await persistAllowancesConfig(nextConfig)
            setAllowancesConfig(nextConfig)
            setAllowancesMessage({ text: 'Valores base guardados correctamente.', type: 'success' })
        } catch (error: unknown) {
            const msg = error && typeof error === 'object' && 'message' in error
                ? String((error as { message: unknown }).message)
                : 'Error al guardar valores base.'
            setAllowancesMessage({ text: msg, type: 'error' })
        } finally {
            setIsSavingAllowances(false)
        }
    }

    const handleSaveMonthAllowances = async () => {
        setIsSavingAllowances(true)
        setAllowancesMessage({ text: '', type: '' })
        try {
            const key = getAllowanceMonthKey(selectedAllowanceYear, selectedAllowanceMonth)
            const foodQ = round2(Math.max(0, monthFoodQ))
            const transportQ = round2(Math.max(0, monthTransportQ))

            const nextConfig: SettlementAllowancesConfig = {
                ...allowancesConfig,
                overrides: {
                    ...allowancesConfig.overrides,
                    [key]: { comida_q: foodQ, transporte_q: transportQ },
                },
            }

            await persistAllowancesConfig(nextConfig)
            const updatedExisting = await syncSettlementRowIfExists(selectedAllowanceYear, selectedAllowanceMonth, foodQ, transportQ)
            setAllowancesConfig(nextConfig)
            setAllowancesMessage({
                text: updatedExisting
                    ? `Montos de ${MONTHS[selectedAllowanceMonth]} ${selectedAllowanceYear} guardados y cierre mensual recalculado.`
                    : `Montos de ${MONTHS[selectedAllowanceMonth]} ${selectedAllowanceYear} guardados para el próximo cierre.`,
                type: 'success',
            })
        } catch (error: unknown) {
            const msg = error && typeof error === 'object' && 'message' in error
                ? String((error as { message: unknown }).message)
                : 'Error al guardar montos del mes.'
            setAllowancesMessage({ text: msg, type: 'error' })
        } finally {
            setIsSavingAllowances(false)
        }
    }

    const handleResetMonthAllowance = async (monthKey: string) => {
        setIsSavingAllowances(true)
        setAllowancesMessage({ text: '', type: '' })
        try {
            const nextOverrides = { ...allowancesConfig.overrides }
            delete nextOverrides[monthKey]
            const nextConfig: SettlementAllowancesConfig = {
                ...allowancesConfig,
                overrides: nextOverrides,
            }
            await persistAllowancesConfig(nextConfig)

            const [yearStr, monthStr] = monthKey.split('-')
            const year = parseInt(yearStr, 10)
            const monthIndex = parseInt(monthStr, 10) - 1
            const fallback = getAllowancesForMonth(nextConfig, year, monthIndex)
            const updatedExisting = await syncSettlementRowIfExists(year, monthIndex, fallback.comida_q, fallback.transporte_q)

            setAllowancesConfig(nextConfig)
            setAllowancesMessage({
                text: updatedExisting
                    ? `Mes ${monthKey} restablecido a los valores base y cierre actualizado.`
                    : `Mes ${monthKey} restablecido a los valores base.`,
                type: 'success',
            })
        } catch (error: unknown) {
            const msg = error && typeof error === 'object' && 'message' in error
                ? String((error as { message: unknown }).message)
                : 'Error al restablecer el mes.'
            setAllowancesMessage({ text: msg, type: 'error' })
        } finally {
            setIsSavingAllowances(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <RefreshCw size={48} className="animate-spin text-zinc-300" />
                <p className="text-zinc-500 font-medium italic">Cargando configuración...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">Configuraciones</h1>
                <p className="text-zinc-500 font-medium text-lg">Administra tu perfil, viáticos del cierre mensual y parámetros del sistema.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="h-auto p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex flex-wrap gap-1 w-full sm:w-auto">
                    <TabsTrigger value="profile" className="rounded-xl px-4 py-2.5 text-sm font-bold">
                        <User className="w-4 h-4 mr-2" /> Mi Perfil
                    </TabsTrigger>
                    {profile?.role === 'admin' && (
                        <>
                            <TabsTrigger value="settlements" className="rounded-xl px-4 py-2.5 text-sm font-bold">
                                <Wallet className="w-4 h-4 mr-2" /> Cierre Mensual
                            </TabsTrigger>
                            <TabsTrigger value="admin" className="rounded-xl px-4 py-2.5 text-sm font-bold">
                                <LockOpen className="w-4 h-4 mr-2" /> Permisos y SIGES
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

                <TabsContent value="profile" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <Card className="border-none shadow-2xl shadow-zinc-200/40 dark:shadow-none bg-white dark:bg-zinc-950 rounded-[32px] overflow-hidden">
                                <CardHeader className="p-8 border-b border-zinc-100 dark:border-zinc-900">
                                    <CardTitle className="text-xl font-black flex items-center gap-2">
                                        <User className="text-blue-600" size={20} /> Información Personal
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nombre Completo</Label>
                                        <Input
                                            value={fullName || 'Sin nombre registrado'}
                                            disabled
                                            className="h-12 rounded-xl bg-zinc-50 border-none text-zinc-500 cursor-not-allowed font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Correo Electrónico</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            <Input
                                                value={user?.email || ''}
                                                disabled
                                                className="h-12 pl-10 rounded-xl bg-zinc-50 border-none text-zinc-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-xl bg-zinc-50 dark:bg-zinc-900 rounded-[32px] p-8">
                                <div className="flex items-center gap-4 text-zinc-500">
                                    <Shield size={24} />
                                    <div>
                                        <h3 className="font-black text-sm uppercase tracking-widest">Seguridad de la Cuenta</h3>
                                        <p className="text-xs font-medium italic">Para cambiar tu contraseña, contacta al administrador.</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="border-none shadow-xl bg-blue-600 rounded-[32px] text-white p-10 space-y-6 text-center">
                                <div className="h-20 w-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl backdrop-blur-sm">
                                    <ShieldCheck size={40} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Rol de Usuario</p>
                                    <h2 className="text-2xl font-black tracking-tighter uppercase leading-tight break-words">
                                        {profile?.role === 'admin' ? 'Administrador' : 'Doctor(a)'}
                                    </h2>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-xs font-medium opacity-80 italic">
                                        Tu rol determina qué secciones puedes ver y editar en el sistema integral.
                                    </p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {profile?.role === 'admin' && (
                    <TabsContent value="settlements" className="mt-0 space-y-6">
                        <Card className="border-2 border-blue-100 dark:border-blue-900/40 shadow-xl bg-white dark:bg-zinc-950 rounded-[32px] overflow-hidden">
                            <CardHeader className="p-8 border-b border-zinc-100 dark:border-zinc-900 bg-blue-50/50 dark:bg-blue-900/10">
                                <CardTitle className="text-xl font-black text-blue-950 dark:text-blue-100 flex items-center gap-2">
                                    <Wallet className="text-blue-600" /> Montos Base Mensuales (Quetzales)
                                </CardTitle>
                                <CardDescription className="text-sm font-medium">
                                    Valores por defecto que se suman completos en quetzales al Cierre Mensual (vigente desde enero 2026).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            <Utensils className="inline w-3 h-3 mr-1" /> Comida del Mes Siguiente (Q)
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">Q</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={defaultFoodQ}
                                                onChange={(e) => setDefaultFoodQ(parseFloat(e.target.value) || 0)}
                                                className="h-12 pl-9 rounded-xl bg-zinc-50 border-zinc-200 font-black text-lg"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            <Car className="inline w-3 h-3 mr-1" /> Auxilio de Transporte (Q)
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">Q</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={defaultTransportQ}
                                                onChange={(e) => setDefaultTransportQ(parseFloat(e.target.value) || 0)}
                                                className="h-12 pl-9 rounded-xl bg-zinc-50 border-zinc-200 font-black text-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSaveDefaultAllowances}
                                    disabled={isSavingAllowances}
                                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                >
                                    {isSavingAllowances ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Guardar Valores Base
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-2 border-emerald-100 dark:border-emerald-900/40 shadow-xl bg-white dark:bg-zinc-950 rounded-[32px] overflow-hidden">
                            <CardHeader className="p-8 border-b border-zinc-100 dark:border-zinc-900 bg-emerald-50/50 dark:bg-emerald-900/10">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-xl font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                                            <Calendar className="text-emerald-600" /> Edición por Mes Específico
                                        </CardTitle>
                                        <CardDescription className="text-sm font-medium mt-1">
                                            Ajusta comida o transporte para un mes concreto. Si el cierre ya fue registrado, actualiza su total automáticamente.
                                        </CardDescription>
                                    </div>
                                    {existingMonthSettlement ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 self-start sm:self-center">
                                            <CheckCircle size={12} /> Cierre Registrado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-600 self-start sm:self-center">
                                            Pendiente de Cierre
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mes</Label>
                                        <select
                                            value={selectedAllowanceMonth}
                                            onChange={(e) => setSelectedAllowanceMonth(parseInt(e.target.value, 10))}
                                            className="w-full h-12 px-4 rounded-xl bg-zinc-50 border border-zinc-200 font-bold text-sm focus:outline-none focus:border-emerald-500"
                                        >
                                            {MONTHS.map((m, idx) => (
                                                <option key={m} value={idx}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Año</Label>
                                        <select
                                            value={selectedAllowanceYear}
                                            onChange={(e) => setSelectedAllowanceYear(parseInt(e.target.value, 10))}
                                            className="w-full h-12 px-4 rounded-xl bg-zinc-50 border border-zinc-200 font-bold text-sm focus:outline-none focus:border-emerald-500"
                                        >
                                            {ALLOWANCE_YEARS.map((y) => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            Comida {MONTHS[selectedAllowanceMonth]} {selectedAllowanceYear} (Q)
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">Q</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={monthFoodQ}
                                                onChange={(e) => setMonthFoodQ(parseFloat(e.target.value) || 0)}
                                                className="h-12 pl-9 rounded-xl bg-zinc-50 border-zinc-200 font-black text-lg"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            Transporte {MONTHS[selectedAllowanceMonth]} {selectedAllowanceYear} (Q)
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">Q</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={monthTransportQ}
                                                onChange={(e) => setMonthTransportQ(parseFloat(e.target.value) || 0)}
                                                className="h-12 pl-9 rounded-xl bg-zinc-50 border-zinc-200 font-black text-lg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSaveMonthAllowances}
                                    disabled={isSavingAllowances}
                                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                >
                                    {isSavingAllowances ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Guardar Montos de {MONTHS[selectedAllowanceMonth]} {selectedAllowanceYear}
                                </Button>

                                {Object.keys(allowancesConfig.overrides).length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Meses con Ajuste Personalizado</Label>
                                        {Object.entries(allowancesConfig.overrides)
                                            .sort(([a], [b]) => b.localeCompare(a))
                                            .map(([monthKey, val]) => {
                                                const [y, m] = monthKey.split('-')
                                                const monthLabel = `${MONTHS[parseInt(m, 10) - 1] || m} ${y}`
                                                return (
                                                    <div key={monthKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                                                        <div>
                                                            <p className="font-black text-sm text-zinc-900 dark:text-zinc-100">{monthLabel}</p>
                                                            <p className="text-xs font-medium text-zinc-500">
                                                                Comida: <span className="font-bold text-amber-700">Q {val.comida_q.toFixed(2)}</span> • Transporte: <span className="font-bold text-cyan-700">Q {val.transporte_q.toFixed(2)}</span>
                                                            </p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => handleResetMonthAllowance(monthKey)}
                                                            disabled={isSavingAllowances}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-3 self-start sm:self-center"
                                                        >
                                                            <Trash2 size={15} className="mr-1.5" /> Restablecer a base
                                                        </Button>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                )}

                                {allowancesMessage.text && (
                                    <div className={`text-sm p-3 rounded-lg border flex items-center gap-2 ${allowancesMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                        {allowancesMessage.text}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {profile?.role === 'admin' && (
                    <TabsContent value="admin" className="mt-0 space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                <LockOpen className="text-purple-600" /> Permisos Especiales
                            </h2>
                            <p className="text-zinc-500 font-medium text-sm">Configuración global del sistema. Úsala con precaución.</p>
                        </div>

                        <Card className="border-2 border-purple-100 dark:border-purple-900/40 shadow-xl bg-white dark:bg-zinc-950 rounded-[32px] overflow-hidden">
                            <CardHeader className="p-8 border-b border-zinc-100 dark:border-zinc-900 bg-purple-50/50 dark:bg-purple-900/10">
                                <CardTitle className="text-xl font-black text-purple-900 dark:text-purple-100 flex items-center gap-2">
                                    Ventana de Facturación Excepcional
                                </CardTitle>
                                <CardDescription className="text-sm font-medium">
                                    Permite temporalmente a los doctores registrar facturas de una fecha atrasada específica.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-4">
                                    {/* Formulario para agregar nuevo */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                <Calendar className="inline w-3 h-3 mr-1" /> Fecha Permitida
                                            </Label>
                                            <Input
                                                type="date"
                                                value={newAllowedDate}
                                                onChange={(e) => setNewAllowedDate(e.target.value)}
                                                className="h-10 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 focus:border-purple-500 font-medium text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                <Clock className="inline w-3 h-3 mr-1" /> Horas (Validez)
                                            </Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="720"
                                                value={selectedDuration}
                                                onChange={(e) => setSelectedDuration(e.target.value)}
                                                placeholder="Ej: 24"
                                                className="h-10 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 focus:border-purple-500 font-medium text-sm"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <Button
                                                onClick={handleAddWindow}
                                                disabled={isSavingAdmin || !newAllowedDate}
                                                className="w-full h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                            >
                                                {isSavingAdmin ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                Añadir permiso
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Lista de ventanas activas */}
                                    {overrideWindows.length > 0 ? (
                                        <div className="space-y-3 mt-6">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Permisos Activos</Label>
                                            {overrideWindows.map(window => (
                                                <div key={window.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                            <Calendar size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm text-zinc-900 dark:text-zinc-100">{window.allowed_date}</p>
                                                            <p className="text-xs font-medium text-zinc-500 flex items-center gap-1 mt-0.5">
                                                                <CheckCircle size={12} className="text-emerald-500" />
                                                                Expira: {new Date(window.expires_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleDeleteWindow(window.id)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-9 px-3"
                                                    >
                                                        <Trash2 size={16} className="sm:mr-2" />
                                                        <span className="hidden sm:inline">Revocar</span>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 mt-6">
                                            <p className="text-zinc-500 text-sm font-medium">No hay ninguna ventana excepcional activa en este momento.</p>
                                        </div>
                                    )}

                                    {adminMessage.text && (
                                        <div className={`mt-4 text-sm p-3 rounded-lg border flex items-center gap-2 ${adminMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                            {adminMessage.text}
                                        </div>
                                    )}
                                </div>

                            </CardContent>
                        </Card>

                        {/* CONFIGURACIÓN SIGES */}
                        <Card className="border-2 border-orange-100 dark:border-orange-900/40 shadow-xl bg-white dark:bg-zinc-950 rounded-[32px] overflow-hidden mt-6">
                            <CardHeader className="p-8 border-b border-zinc-100 dark:border-zinc-900 bg-orange-50/50 dark:bg-orange-900/10">
                                <CardTitle className="text-xl font-black text-orange-900 dark:text-orange-100 flex items-center gap-2">
                                    <Database className="text-orange-600" /> API Facturación (SIGES)
                                </CardTitle>
                                <CardDescription className="text-sm font-medium">
                                    Cambia a URL de producción o test, y actualiza tus credenciales aquí mismo.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">API BASE URL</Label>
                                        <div className="relative">
                                            <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            <Input
                                                value={sigesUrl}
                                                onChange={(e) => setSigesUrl(e.target.value)}
                                                placeholder="http://feltestapi.globalsistec.com"
                                                className="h-12 pl-10 rounded-xl bg-zinc-50 border-zinc-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">API Key (Header)</Label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            <Input
                                                value={sigesApiKey}
                                                onChange={(e) => setSigesApiKey(e.target.value)}
                                                placeholder="sgk_..."
                                                className="h-12 pl-10 rounded-xl bg-zinc-50 border-zinc-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Webhook Secret Key (Verificación HMAC)</Label>
                                        <div className="relative">
                                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            <Input
                                                value={sigesWebhookSecret}
                                                onChange={(e) => setSigesWebhookSecret(e.target.value)}
                                                placeholder="Introduce la llave secreta para webhooks..."
                                                className="h-12 pl-10 rounded-xl bg-zinc-50 border-zinc-200"
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-1">Ésta misma llave la debes configurar en el portal de Webhooks de SIGES para que Mascotas acepte las peticiones.</p>
                                    </div>

                                    <Button
                                        onClick={handleSaveSigesConfig}
                                        disabled={isSavingSiges}
                                        className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold mt-4"
                                    >
                                        {isSavingSiges ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Guardar Configuración SIGES
                                    </Button>

                                    {sigesMessage.text && (
                                        <div className={`mt-4 text-sm p-3 rounded-lg border flex items-center gap-2 ${sigesMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                            {sigesMessage.text}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
