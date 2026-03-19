'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, Mail, Shield, ShieldCheck, Save, RefreshCw, Calendar, Clock, LockOpen, CheckCircle } from 'lucide-react'

// New Interface for Override Settings
interface OverrideSettings {
    active: boolean;
    allowed_date: string | null;
    expires_at: string | null;
}

export default function SettingsPage() {
    const supabase = createClient()
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [fullName, setFullName] = useState('')

    // Admin Settings State
    const [overrideSettings, setOverrideSettings] = useState<OverrideSettings>({ active: false, allowed_date: null, expires_at: null })
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
                        setOverrideSettings(settingsData.value as OverrideSettings)
                    }
                }
            }
            setIsLoading(false)
        }
        loadProfile()
    }, [])

    const handleSaveAdminSettings = async () => {
        setIsSavingAdmin(true)
        setAdminMessage({ text: '', type: '' })
        try {
            let expiresAt = null
            if (overrideSettings.active) {
                if (!overrideSettings.allowed_date) {
                    throw new Error('Debes seleccionar una fecha permitida para habilitar el permiso.')
                }
                const date = new Date()
                date.setHours(date.getHours() + parseInt(selectedDuration))
                expiresAt = date.toISOString()
            }

            const newValue = {
                active: overrideSettings.active,
                allowed_date: overrideSettings.active ? overrideSettings.allowed_date : null,
                expires_at: overrideSettings.active ? expiresAt : null
            }

            const { error } = await supabase
                .from('app_settings')
                .update({ value: newValue })
                .eq('key', 'invoice_date_override')
            
            if (error) throw error

            setOverrideSettings(newValue)
            setAdminMessage({ text: 'Configuración guardada exitosamente.', type: 'success' })
        } catch (error: any) {
            setAdminMessage({ text: error.message || 'Error al guardar.', type: 'error' })
        } finally {
            setIsSavingAdmin(false)
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
                            
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <Label className="text-sm font-bold flex-1 cursor-pointer" htmlFor="toggle-override">
                                    Habilitar permiso temporal
                                </Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                                        {overrideSettings.active ? 'Activo' : 'Inactivo'}
                                    </span>
                                    <button 
                                        id="toggle-override"
                                        onClick={() => setOverrideSettings(prev => ({ ...prev, active: !prev.active }))}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${overrideSettings.active ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${overrideSettings.active ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {overrideSettings.active && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-purple-50/30 dark:bg-purple-900/5 border border-purple-100 dark:border-purple-900/20 animate-in fade-in zoom-in-95">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            <Calendar className="inline w-3 h-3 mr-1" /> Fecha Permitida
                                        </Label>
                                        <Input
                                            type="date"
                                            value={overrideSettings.allowed_date || ''}
                                            onChange={(e) => setOverrideSettings(prev => ({ ...prev, allowed_date: e.target.value }))}
                                            className="h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 focus:border-purple-500 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            <Clock className="inline w-3 h-3 mr-1" /> Horas de Validez
                                        </Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="720"
                                            value={selectedDuration}
                                            onChange={(e) => setSelectedDuration(e.target.value)}
                                            placeholder="Ej: 24"
                                            className="h-12 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 focus:border-purple-500 font-medium"
                                        />
                                        <p className="text-[10px] text-zinc-400">Indica cuántas horas durará el permiso (ej: 24 = 1 día).</p>
                                    </div>
                                </div>
                            )}

                            {overrideSettings.expires_at && overrideSettings.active && (
                                <div className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 p-3 rounded-lg border border-emerald-100 flex items-center gap-2">
                                    <CheckCircle size={16} /> 
                                    Este permiso expira el {new Date(overrideSettings.expires_at).toLocaleString()}
                                </div>
                            )}

                            {adminMessage.text && (
                                <div className={`text-sm p-3 rounded-lg border flex items-center gap-2 ${adminMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                    {adminMessage.text}
                                </div>
                            )}

                            <Button 
                                onClick={handleSaveAdminSettings}
                                disabled={isSavingAdmin}
                                className="w-full md:w-auto h-12 px-8 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold tracking-wide"
                            >
                                {isSavingAdmin ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar cambios
                            </Button>

                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
