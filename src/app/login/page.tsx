'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dog, Loader2, Lock, Mail, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    // Redirect if already logged in
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                router.push('/dashboard/metrics')
            }
        }
        checkUser()
    }, [router, supabase])

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message === 'Invalid login credentials' ? 'Credenciales incorrectas. Verifica tu usuario y contraseña.' : error.message)
            setIsLoading(false)
        } else {
            router.push('/dashboard/metrics')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100/50 dark:bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[28px] shadow-2xl shadow-blue-500/20 transform hover:scale-110 transition-transform duration-300">
                            <Dog size={40} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50">
                        Bienvenido
                    </h1>
                    <p className="text-zinc-500 font-medium">
                        Acceso restringido para personal autorizado
                    </p>
                </div>

                <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-none bg-white/80 dark:bg-zinc-800/50 backdrop-blur-xl rounded-[32px] overflow-hidden">
                    <CardHeader className="pt-10 pb-4 px-8">
                        <CardTitle className="text-xl font-black text-zinc-900 dark:text-zinc-50">Iniciar Sesión</CardTitle>
                        <CardDescription className="text-zinc-400 font-medium pt-1">
                            Ingresa tus credenciales para continuar
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-10">
                        <form onSubmit={handleAuth} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Usuario / Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="ejemplo@mascotas.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-14 pl-12 rounded-2xl border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:ring-blue-500 font-medium transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" title='lock' className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-14 pl-12 rounded-2xl border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:ring-blue-500 font-medium transition-all"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold animate-in shake duration-300">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-14 bg-zinc-900 hover:bg-black dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white text-white rounded-2xl text-lg font-black shadow-xl transition-all active:scale-95"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        Entrar <ArrowRight size={20} />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 animate-pulse">
                    © 2025 Mascotas Clínica Veterinaria
                </p>
            </div>
        </div>
    )
}

