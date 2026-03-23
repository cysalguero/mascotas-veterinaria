'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, Mail, Shield, ShieldCheck, Save, RefreshCw, Calendar, Clock, LockOpen, CheckCircle, Trash2, Plus } from 'lucide-react'

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

                        // Si limpiamos algo, guardemos silenciosamente el array limpio en la BD
                        if (cleanWindows.length !== windows.length) {
                            supabase.from('app_settings').update({ value: cleanWindows }).eq('key', 'invoice_date_override').then()
                        }
                    }
                }
            }
            setIsLoading(false)
        }
        loadProfile()
    }, [])

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



    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <RefreshCw size={48} className="animate-spin text-zinc-300" />
                <p className="text-zinc-500 font-medium italic">Cargando configuración...</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">Configuraciones de Usuario</h1>
                <p className="text-zinc-500 font-medium text-lg">Administra tu perfil y preferencias de cuenta.</p>
            </div>

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
                            <p className="text-xs font-medium opacity-80 italic italic">
                                Tu rol determina qué secciones puedes ver y editar en el sistema integral.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* ADMIN CONFIGURATION SECTION */}
            {profile?.role === 'admin' && (
                <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
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
                </div>
            )}
        </div>
    )
}
