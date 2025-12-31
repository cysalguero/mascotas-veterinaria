'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, Mail, Shield, ShieldCheck, Save, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
    const supabase = createClient()
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [fullName, setFullName] = useState('')

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
            }
            setIsLoading(false)
        }
        loadProfile()
    }, [])



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
        </div>
    )
}
