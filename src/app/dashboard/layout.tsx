'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    LayoutDashboard,
    FileCheck,
    Calendar,
    PieChart,
    LogOut,
    Dog,
    Menu,
    Settings,
    HelpCircle,
    Home,
    History,
    FileSpreadsheet,
    Activity
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useState, ReactNode, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const analysisItems = [
    {
        title: 'Dashboard',
        href: '/dashboard/metrics',
        icon: LayoutDashboard,
    },
]

const operationsItems = [
    {
        title: 'Nueva Venta',
        href: '/dashboard',
        icon: FileCheck,
    },
    {
        title: 'Historial Ventas',
        href: '/dashboard/records',
        icon: History,
    },
    {
        title: 'Calendario',
        href: '/dashboard/calendar',
        icon: Calendar,
    },
]

const administrationItems = [
    {
        title: 'Cierre Mensual',
        href: '/dashboard/settlements',
        icon: FileSpreadsheet,
    },
    {
        title: 'Historial Pagos',
        href: '/dashboard/settlements/history',
        icon: History,
    },
]

function NavItem({
    href,
    icon: Icon,
    children,
    isActive
}: {
    href: string
    icon: any
    children: ReactNode
    isActive?: boolean
}) {
    return (
        <Link
            href={href}
            className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${isActive
                ? 'bg-zinc-100 text-zinc-900 font-medium dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50'
                }`}
        >
            <Icon className={`h-4 w-4 mr-3 flex-shrink-0 ${isActive ? 'text-zinc-900 dark:text-zinc-50' : ''}`} />
            {children}
        </Link>
    )
}

function Sidebar({
    visibleAnalysis,
    visibleOperations,
    visibleAdministration,
    userRole,
    pathname,
    onLogout
}: {
    visibleAnalysis: typeof analysisItems,
    visibleOperations: typeof operationsItems,
    visibleAdministration: typeof administrationItems,
    userRole: string | null,
    pathname: string,
    onLogout: () => Promise<void>
}) {

    return (
        <div className="flex h-full flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 w-64 hidden lg:flex fixed left-0 top-0">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-6">
                <div className="p-1.5 bg-zinc-900 rounded-md text-white dark:bg-white dark:text-zinc-900">
                    <Dog size={18} />
                </div>
                <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Mascotas Clinica Veterinaria</span>
            </div>

            {/* Navigation groups */}
            <div className="flex-grow overflow-y-auto p-4">
                <div className="space-y-6">
                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            Análisis
                        </p>
                        <div className="space-y-1">
                            {visibleAnalysis.map((item) => (
                                <NavItem
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    isActive={pathname === item.href}
                                >
                                    {item.title}
                                </NavItem>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            Operaciones
                        </p>
                        <div className="space-y-1">
                            {visibleOperations.map((item) => (
                                <NavItem
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    isActive={pathname === item.href}
                                >
                                    {item.title}
                                </NavItem>
                            ))}
                        </div>
                    </div>

                    {userRole === 'admin' && (
                        <div>
                            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                Administración
                            </p>
                            <div className="space-y-1">
                                {visibleAdministration.map((item) => (
                                    <NavItem
                                        key={item.href}
                                        href={item.href}
                                        icon={item.icon}
                                        isActive={pathname === item.href}
                                    >
                                        {item.title}
                                    </NavItem>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            Soporte
                        </p>
                        <div className="space-y-1">
                            <NavItem href="/dashboard/help" icon={HelpCircle}>Ayuda & Manual</NavItem>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-4">
                <Button
                    variant="ghost"
                    onClick={onLogout}
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2"
                >
                    <LogOut className="mr-3 h-4 w-4" />
                    Cerrar Sesión
                </Button>
            </div>
        </div>
    )
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const [userRole, setUserRole] = useState<'admin' | 'doctor' | null>(null)
    const [userEmail, setUserEmail] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    useEffect(() => {
        async function fetchUserRole() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const email = user.email || ''
                setUserEmail(email)

                // Prioridad 1: Metadatos
                let role = user.app_metadata?.role || user.user_metadata?.role

                // Prioridad 2: Base de Datos
                if (!role) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .maybeSingle()
                    role = profile?.role
                }

                // Prioridad 3: Override por Email (Seguridad dueños)
                const adminEmails = ['cysalguero@gmail.com', 'sergiounah@gmail.com']
                if (adminEmails.includes(email.toLowerCase())) {
                    role = 'admin'
                }

                setUserRole((role as 'admin' | 'doctor') || 'doctor')
            }
            setIsLoading(false)
        }
        fetchUserRole()
    }, [supabase])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-white"></div>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Cargando Entorno...</p>
                </div>
            </div>
        )
    }

    const visibleAnalysis = analysisItems
    const visibleOperations = operationsItems
    const visibleAdministration = userRole === 'admin' ? administrationItems : []

    const allVisibleLinks = [...visibleAnalysis, ...visibleOperations, ...visibleAdministration]
    const activeItem = allVisibleLinks.find(item => item.href === pathname)

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b bg-white dark:bg-zinc-950">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-zinc-900 rounded-md text-white dark:bg-white dark:text-zinc-900">
                        <Dog size={18} />
                    </div>
                    <span className="font-bold">Mascotas Clinica Veterinaria</span>
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <div className="flex h-16 items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-6">
                            <span className="font-bold text-lg">Mascotas Clinica Veterinaria</span>
                        </div>
                        <div className="p-4 space-y-1">
                            <div className="pb-4">
                                <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Análisis</p>
                                {visibleAnalysis.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${pathname === item.href ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
                                    >
                                        <item.icon className="mr-3 h-4 w-4" />
                                        {item.title}
                                    </Link>
                                ))}
                            </div>

                            <div className="pb-4">
                                <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Operaciones</p>
                                {visibleOperations.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${pathname === item.href ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
                                    >
                                        <item.icon className="mr-3 h-4 w-4" />
                                        {item.title}
                                    </Link>
                                ))}
                            </div>

                            {userRole === 'admin' && (
                                <div>
                                    <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Administración</p>
                                    {visibleAdministration.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${pathname === item.href ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
                                        >
                                            <item.icon className="mr-3 h-4 w-4" />
                                            {item.title}
                                        </Link>
                                    ))}
                                </div>
                            )}

                            <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800">
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <LogOut className="mr-3 h-4 w-4" />
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <Sidebar
                visibleAnalysis={visibleAnalysis}
                visibleOperations={visibleOperations}
                visibleAdministration={visibleAdministration}
                userRole={userRole}
                pathname={pathname}
                onLogout={handleLogout}
            />

            <div className="lg:pl-64 focus-within:ring-0">
                <header className="flex h-16 items-center border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 justify-between sticky top-0 z-10">
                    <nav className="flex items-center text-sm font-medium uppercase tracking-wider">
                        <Link
                            href="/dashboard/metrics"
                            className="text-zinc-400 hover:text-zinc-900 transition-colors"
                        >
                            Dashboard
                        </Link>
                        {activeItem && activeItem.href !== '/dashboard/metrics' && (
                            <>
                                <span className="mx-2 text-zinc-300">/</span>
                                <Link
                                    href={activeItem.href}
                                    className="text-zinc-900 dark:text-zinc-100"
                                >
                                    {activeItem.title}
                                </Link>
                            </>
                        )}
                        {!activeItem && pathname === '/dashboard' && (
                            <>
                                <span className="mx-2 text-zinc-300">/</span>
                                <Link
                                    href="/dashboard"
                                    className="text-zinc-900 dark:text-zinc-100"
                                >
                                    Nueva Venta
                                </Link>
                            </>
                        )}
                    </nav>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">
                                    {userEmail.split('@')[0]}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    {userRole === 'admin' ? 'Administrador' : 'Doctor(a)'}
                                </p>
                            </div>
                            <Avatar className="h-9 w-9 border-2 border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <AvatarImage src={`https://avatar.vercel.sh/${userEmail}`} />
                                <AvatarFallback className="font-black bg-zinc-900 text-white text-xs">
                                    {userEmail.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </header>
                <main className="p-6 md:p-8 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
