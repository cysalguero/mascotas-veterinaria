'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Book,
    User,
    Database,
    ShieldCheck,
    Layers,
    Zap,
    ChevronRight,
    PlayCircle,
    Settings,
    FileText,
    Wallet,
    Trash2,
    Search,
    CheckCircle2,
    Info,
    Smartphone,
    Monitor,
    GitBranch,
    Lock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function HelpPage() {
    const [activeTab, setActiveTab] = useState('manual')
    const [userRole, setUserRole] = useState<'admin' | 'doctor' | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function fetchUserRole() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const email = user.email || ''
                let role = user.app_metadata?.role || user.user_metadata?.role

                if (!role) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .maybeSingle()
                    role = profile?.role
                }

                // Override por emails de dueños conocidos
                const adminEmails = ['cysalguero@gmail.com', 'sergiounah@gmail.com']
                if (adminEmails.includes(email.toLowerCase())) {
                    role = 'admin'
                }

                setUserRole((role as 'admin' | 'doctor') || 'doctor')
            }
        }
        fetchUserRole()
    }, [])

    const isAdmin = userRole === 'admin'

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">
                        <Book size={14} /> Sistema de Información
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Manual de Usuario y Documentación</h1>
                    <p className="text-zinc-500 font-medium text-lg max-w-2xl">
                        Guía normativa y técnica para el uso y mantenimiento del sistema de gestión Mascotas.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="manual" className="space-y-8" onValueChange={setActiveTab}>
                <div className="flex justify-center">
                    <TabsList className="h-16 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-inner">
                        <TabsTrigger
                            value="manual"
                            className="h-12 px-8 rounded-2xl font-bold text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all gap-2"
                        >
                            <User size={16} /> Manual de Usuario
                        </TabsTrigger>
                        <TabsTrigger
                            value="doc"
                            className="h-12 px-8 rounded-2xl font-bold text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all gap-2"
                        >
                            <Settings size={16} /> Especificaciones Técnicas
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* --- MANUAL DE USUARIO --- */}
                <TabsContent value="manual" className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 text-white text-xs font-bold">1</span>
                                Registro de Facturas
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                                El módulo de registro permite la incorporación de comprobantes de venta al sistema para su posterior procesamiento contable.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex gap-4">
                                    <div className="mt-1 h-5 w-5 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center flex-shrink-0">
                                        <ChevronRight size={12} strokeWidth={3} />
                                    </div>
                                    <span className="text-zinc-700 dark:text-zinc-300 text-sm font-medium">
                                        <strong>Vínculo de Comprobante:</strong> Ingrese el enlace (URL) directo al archivo o imagen de la factura. El sistema validará la accesibilidad del recurso.
                                    </span>
                                </li>
                                <li className="flex gap-4">
                                    <div className="mt-1 h-5 w-5 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center flex-shrink-0">
                                        <ChevronRight size={12} strokeWidth={3} />
                                    </div>
                                    <span className="text-zinc-700 dark:text-zinc-300 text-sm font-medium">
                                        <strong>Clasificación:</strong> Seleccione la categoría correspondiente. Las categorías comisionables están identificadas por el sistema para el cálculo de honorarios.
                                    </span>
                                </li>
                                <li className="flex gap-4">
                                    <div className="mt-1 h-5 w-5 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center flex-shrink-0">
                                        <ChevronRight size={12} strokeWidth={3} />
                                    </div>
                                    <span className="text-zinc-700 dark:text-zinc-300 text-sm font-medium">
                                        <strong>Validación de Periodo:</strong> Los usuarios con rol 'Doctor' están restringidos al registro de facturas dentro del mes calendario en curso.
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[40px] p-8 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center">
                            <div className="text-left space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Requerimiento Técnico</h4>
                                <p className="text-sm font-medium text-zinc-600 leading-relaxed italic">
                                    "Asegúrese de que el enlace proporcionado sea público o tenga los permisos necesarios para que el departamento administrativo pueda realizar la auditoría del documento."
                                </p>
                            </div>
                        </div>
                    </section>

                    <Card className="border-none shadow-2xl shadow-zinc-200/40 dark:shadow-none bg-white dark:bg-zinc-950 rounded-[40px] overflow-hidden">
                        <CardHeader className="p-10 border-b border-zinc-100 dark:border-zinc-900">
                            <CardTitle className="text-2xl font-black">Guía de Secciones</CardTitle>
                            <CardDescription>Explora las funciones de cada módulo del sistema</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="flex gap-6">
                                    <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-[20px] flex items-center justify-center flex-shrink-0">
                                        <Layers size={24} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">Resumen de Métricas</h3>
                                        <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                                            Visualización consolidada del desempeño mensual, incluyendo el recuento de procedimientos comisionables y el seguimiento hacia el objetivo de ingresos establecido.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="h-14 w-14 bg-zinc-50 text-zinc-600 rounded-[20px] flex items-center justify-center flex-shrink-0">
                                        <Smartphone size={24} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">Auditabilidad de Ventas</h3>
                                        <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                                            Módulo de consulta de registros históricos donde es posible verificar el estatus de cada transacción y sus documentos asociados.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="h-14 w-14 bg-zinc-50 text-zinc-600 rounded-[20px] flex items-center justify-center flex-shrink-0">
                                        <Wallet size={24} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">Cierres Administrativos</h3>
                                        <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                                            Proceso de liquidación mensual donde se computan los honorarios basados en la productividad y cumplimiento de metas operativas.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="h-14 w-14 bg-zinc-50 text-zinc-600 rounded-[20px] flex items-center justify-center flex-shrink-0">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-lg">Integridad y Soporte</h3>
                                        <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                                            Políticas de respaldo y auditoría continua para garantizar que cada registro contable y médico sea inmutable y veraz en el largo plazo.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-zinc-100 dark:border-zinc-900 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
                                <div className="space-y-4">
                                    <div className="h-16 w-16 bg-zinc-50 text-zinc-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                                        <Search size={28} />
                                    </div>
                                    <h3 className="font-bold tracking-tight">Capacidad de Búsqueda</h3>
                                    <p className="text-sm text-zinc-500 font-medium font-medium">Indexación instantánea por identificador de ticket, fecha o metadatos de la operación.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-16 w-16 bg-zinc-50 text-zinc-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                                        <ShieldCheck size={28} />
                                    </div>
                                    <h3 className="font-bold tracking-tight">Integridad de Información</h3>
                                    <p className="text-sm text-zinc-500 font-medium">Aislamiento de datos mediante políticas de seguridad: cada usuario accede estrictamente a su historial.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-16 w-16 bg-zinc-50 text-zinc-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                                        <Trash2 size={28} />
                                    </div>
                                    <h3 className="font-bold tracking-tight">Modificación de Registros</h3>
                                    <p className="text-sm text-zinc-500 font-medium">La anulación de asientos contables está sujeta a la revisión y autorización del rol Administrador.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {isAdmin && (
                        <section className="space-y-8">
                            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-zinc-900">
                                <Wallet size={32} />
                                Estructura de Compensación Mensual
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-zinc-950 text-white rounded-[40px] p-10 space-y-6">
                                    <h3 className="text-lg font-bold">Base de Cálculo</h3>
                                    <p className="text-zinc-400 font-medium">
                                        El sistema determina la liquidación mensual bajo los siguientes parámetros:
                                    </p>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                            <span className="font-bold">Honorario Base</span>
                                            <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Ajuste por días laborados</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                            <span className="font-bold">Comisiones Mensuales (5%)</span>
                                            <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Servicios comisionables</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2">
                                            <span className="font-bold text-zinc-200">Bono por Objetivos ($100)</span>
                                            <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Meta {'>'} Q 30,000</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center space-y-6">
                                    <div className="flex gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800">
                                        <div className="h-10 w-10 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 italic">Trazabilidad de Operaciones</h4>
                                            <p className="text-sm text-zinc-500 font-medium">Todo rubro liquidado corresponde a un registro auditable dentro de la base de datos.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 p-6 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800">
                                        <div className="h-10 w-10 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 italic">Bloqueo de Periodos</h4>
                                            <p className="text-sm text-zinc-500 font-medium">Tras la confirmación administrativa, el periodo queda inhabilitado para modificaciones.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </TabsContent>

                <TabsContent value="doc" className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-10">
                            <section className="space-y-6">
                                <h3 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    <Layers className="text-zinc-900" size={24} /> Arquitectura de Sistemas y Stack Tecnológico
                                </h3>
                                <p className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                                    La plataforma Mascotas está fundamentada en una arquitectura de aplicaciones web modernas, utilizando el framework **Next.js 14** bajo el paradigma de **App Router**. Esta estructura permite una renderización optimizada y una gestión eficiente de rutas tanto en el lado del servidor (SSR) como en el cliente.
                                </p>
                                <div className="p-8 bg-zinc-950 rounded-[32px] font-mono text-xs text-zinc-400 space-y-4 shadow-2xl border border-zinc-800">
                                    <p className="text-zinc-500 font-bold">// Definición de Componentes Críticos</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                                        <p>- <span className="text-white">Motor de Interfaz:</span> React 18 / TypeScript 5.0</p>
                                        <p>- <span className="text-white">Procesamiento de Estilos:</span> Tailwind Engine / CSS Modules</p>
                                        <p>- <span className="text-white">Gestión de Estado:</span> React Hooks / Server Actions</p>
                                        <p>- <span className="text-white">Capa de Autenticación:</span> Supabase Auth (JWT / GoTrue)</p>
                                        <p>- <span className="text-white">Backend Operacional:</span> PostgreSQL (PostgREST API)</p>
                                        <p>- <span className="text-white">Infraestructura:</span> Vercel Cloud Architecture</p>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h3 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    <Database className="text-zinc-900" size={24} /> Diccionario y Relacional de Datos
                                </h3>
                                <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                                    El modelo de persistencia sigue una estructura relacional normalizada en PostgreSQL para garantizar la integridad referencial y la consistencia de los cierres contables.
                                </p>
                                <div className="space-y-6">
                                    <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 hover:border-zinc-400 transition-colors">
                                        <h4 className="font-bold text-sm mb-3 uppercase tracking-widest text-zinc-400">Entidad: Invoices (Facturación)</h4>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed mb-4">
                                            Es la tabla pivote del sistema. Almacena metadatos críticos incluyendo el identificador único de ticket, vinculación externa con el comprobante (file_url), y la relación de propiedad con el catálogo de usuarios (doctor_id).
                                        </p>
                                        <ul className="text-[10px] space-y-1 font-mono text-zinc-500">
                                            <li>- Constraint: PRIMARY KEY (id)</li>
                                            <li>- Foreign Key: (doctor_id) REFERENCES profiles(id)</li>
                                            <li>- Indexing: (fecha_venta), (ticket_numero)</li>
                                        </ul>
                                    </div>
                                    <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 hover:border-zinc-400 transition-colors">
                                        <h4 className="font-bold text-sm mb-3 uppercase tracking-widest text-zinc-400">Entidad: Settlements (Liquidaciones)</h4>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed mb-4">
                                            Almacena registros atómicos de cierres mensuales. Incluye cálculos de prorrateo salarial, comisiones devengadas y bonificaciones por cumplimiento de metas. Estos registros son inmutables tras su aprobación administrativa.
                                        </p>
                                        <ul className="text-[10px] space-y-1 font-mono text-zinc-500">
                                            <li>- Constraint: UNIQUE (doctor_id, mes, anio)</li>
                                            <li>- Data Types: NUMERIC(10,2) para precisión monetaria</li>
                                        </ul>
                                    </div>
                                    <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 hover:border-zinc-400 transition-colors">
                                        <h4 className="font-bold text-sm mb-3 uppercase tracking-widest text-zinc-400">Control de Acceso (RBAC)</h4>
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                                            Se utiliza la tabla `profiles` para gestionar los privilegios globales. Roles soportados: `admin` (acceso irrestricto y gestión técnica) y `doctor` (consulta y registro limitado a la propia producción).
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-8">
                            <Card className="border-none shadow-xl bg-zinc-900 text-white rounded-[40px] overflow-hidden">
                                <CardContent className="p-10 space-y-6">
                                    <ShieldCheck size={40} className="text-zinc-500" />
                                    <h3 className="text-xl font-bold tracking-tight">Capa de Seguridad RLS</h3>
                                    <p className="text-sm font-medium opacity-80 leading-relaxed">
                                        La protección de datos se implementa mediante **Row Level Security** (RLS) a nivel de motor de base de datos.
                                    </p>
                                    <div className="p-4 bg-white/5 rounded-2xl font-mono text-[10px] text-zinc-400 space-y-2">
                                        <p className="text-zinc-300">-- Política de Aislamiento</p>
                                        <p>CREATE POLICY "Select_Own"</p>
                                        <p>ON public.invoices</p>
                                        <p>FOR SELECT</p>
                                        <p>USING (doctor_id = auth.uid());</p>
                                    </div>
                                    <p className="text-xs font-medium opacity-70">
                                        Esto garantiza que la lógica de seguridad es persistente incluso si se accede a través de APIs externas, cumpliendo con los estándares de integridad de datos.
                                    </p>
                                    <div className="pt-6 border-t border-white/10">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estado Operativo</p>
                                        <p className="font-bold italic flex items-center gap-2">
                                            PRODUCCIÓN ACTIVA
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="p-8 bg-zinc-50 dark:bg-zinc-900 rounded-[40px] border border-zinc-100 dark:border-zinc-800 space-y-6">
                                <h3 className="font-bold text-lg">Protocolo de Despliegue</h3>
                                <div className="space-y-5">
                                    <div className="flex items-start gap-4">
                                        <GitBranch size={16} className="text-zinc-400 mt-1" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900">Control de Versiones</p>
                                            <p className="text-[10px] text-zinc-500">Gestión mediante repositorio Git bajo el estándar de Trunk-Based Development.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Zap size={16} className="text-zinc-400 mt-1" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900">Pipeline de CI/CD</p>
                                            <p className="text-[10px] text-zinc-500">Automatización de compilación y despliegue a través de edge-functions de Vercel.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Monitor size={16} className="text-zinc-400 mt-1" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900">Monitoreo</p>
                                            <p className="text-[10px] text-zinc-500">Telemetría integrada para detección de fallos y auditoría de peticiones SQL.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[40px] space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-900 border border-zinc-200">
                                <Info size={24} />
                            </div>
                            <h3 className="text-2xl font-bold">Gestión de Cambios y Mantenimiento</h3>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed italic">
                            Cualquier modificación estructural en el esquema de datos debe ser canalizada a través del sistema de migraciones de Supabase (SQL). Se enfatiza la prohibición de eliminar columnas en la tabla `settlements` sin un procedimiento de respaldo previo, debido a su naturaleza de registro histórico contable.
                        </p>
                    </div>
                </TabsContent>
            </Tabs>

        </div>
    )
}
