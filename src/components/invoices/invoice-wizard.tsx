'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, CheckCircle, ArrowRight, ArrowLeft, XCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface N8nResponseItem {
    descripcion: string
    cantidad: number
    precio_unitario_q: number
    total_q: number
    comisionable: boolean
    ticket_numero: number
    fecha_venta_iso: string
    forma_pago: string
    subtotal_q: number
    total_q_factura: number
    pagado_q: number
    cambio_q: number
    observaciones_doctora: string
}

interface Category {
    id: string
    name: string
}

export function InvoiceWizard() {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [isLoading, setIsLoading] = useState(false)
    const [url, setUrl] = useState('')
    const [observations, setObservations] = useState('')
    const [previewData, setPreviewData] = useState<N8nResponseItem[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategories, setSelectedCategories] = useState<Record<number, string>>({})
    const [error, setError] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<'admin' | 'doctor' | null>(null)
    const [accountingMonth, setAccountingMonth] = useState<string>('')
    const [accountingYear, setAccountingYear] = useState<string>('')
    const supabase = createClient()

    useEffect(() => {
        const fetchInitialData = async () => {
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
                const adminEmails = ['cysalguero@gmail.com', 'sergiounah@gmail.com']
                if (adminEmails.includes(email.toLowerCase())) {
                    role = 'admin'
                }
                setUserRole((role as 'admin' | 'doctor') || 'doctor')
            }

            const { data: catData, error: catError } = await supabase
                .from('categories')
                .select('id, name')
                .order('name')

            if (catError) {
                console.error('Error fetching categories:', JSON.stringify(catError, null, 2))
                setCategories([
                    { id: 'uuid-1', name: 'Consulta' },
                    { id: 'uuid-2', name: 'Farmacia' },
                    { id: 'uuid-3', name: 'Vacunación' },
                    { id: 'uuid-4', name: 'Cirugía' },
                    { id: 'uuid-5', name: 'Alimentos' },
                    { id: 'uuid-6', name: 'Estética' }
                ])
            } else {
                setCategories(catData || [])
            }
        }
        fetchInitialData()
    }, [])

    const handleProcess = async () => {
        setIsLoading(true)
        setError(null)

        try {
            if (!url.trim()) throw new Error("⚠️ El link del recibo es obligatorio.")
            if (!observations.trim()) throw new Error("⚠️ Las observaciones son obligatorias.")

            if (url) {
                const cleanUrl = url.trim()
                const { data: duplicates } = await supabase
                    .from('invoices')
                    .select('id, ticket_numero')
                    .eq('file_url', cleanUrl)

                if (duplicates && duplicates.length > 0) {
                    const ticket = duplicates[0].ticket_numero
                    throw new Error(`⚠️ Esta factura ya fue registrada anteriormente (Ticket #${ticket}). Si deseas ingresarla de nuevo, primero elimínala del historial.`)
                }
            }

            const response = await fetch('https://vet-n8n.cysolutions.cloud/webhook/recibo-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recibo_url: url,
                    observaciones_doctora: observations
                })
            })

            if (!response.ok) {
                throw new Error('Error al conectar con el servidor de análisis.')
            }

            const data: N8nResponseItem[] = await response.json()
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No se detectaron ítems en el recibo.')
            }

            setPreviewData(data)
            setSelectedCategories({})
            setStep(2)
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error desconocido.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCategoryChange = (index: number, categoryId: string) => {
        setSelectedCategories(prev => ({
            ...prev,
            [index]: categoryId
        }))
    }

    const handleConfirm = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const missingCategories = previewData.some((_, idx) => !selectedCategories[idx])

            if (missingCategories) {
                throw new Error("⚠️ Por favor asigna una categoría a TODOS los productos antes de guardar.")
            }

            const header = previewData[0]

            // --- VALIDACIÓN DE MES ACTUAL ---
            // --- VALIDACIÓN DE MES ACTUAL ---
            const invoiceDate = new Date(header.fecha_venta_iso + 'T12:00:00')
            const now = new Date()
            const isCurrentMonth = invoiceDate.getMonth() === now.getMonth() && invoiceDate.getFullYear() === now.getFullYear()

            // Lógica de validación de fechas
            let finalAccountingDate = header.fecha_venta_iso

            if (userRole === 'admin') {
                // Si el admin eligió mes/año custom
                if (accountingMonth && accountingYear) {
                    // Cramos una fecha arbitraria (día 15) de ese mes y año
                    // Formato YYYY-MM-DD
                    const m = (parseInt(accountingMonth) + 1).toString().padStart(2, '0')
                    finalAccountingDate = `${accountingYear}-${m}-15`
                }
            } else {
                // Si es doctor, restringir estrictamente al mes actual
                if (!isCurrentMonth) {
                    throw new Error("⚠️ No se puede guardar tu factura porque es de un mes anterior o posterior. Solo puedes registrar facturas del mes actual. Contacta a un administrador.")
                }
            }
            // --------------------------------

            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) throw new Error('No user found')

            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    ticket_numero: header.ticket_numero,
                    fecha_venta: header.fecha_venta_iso,
                    forma_pago: header.forma_pago,
                    subtotal_q: header.subtotal_q,
                    total_q: header.total_q_factura,
                    pagado_q: header.pagado_q,
                    cambio_q: header.cambio_q,
                    doctor_id: userData.user.id,
                    observaciones_doctora: header.observaciones_doctora,
                    file_url: url,
                    fecha_contable: finalAccountingDate // Guardamos la fecha contable
                })
                .select()
                .single()

            if (invoiceError) throw invoiceError

            const itemsToInsert = previewData.map((item, idx) => ({
                invoice_id: invoice.id,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precio_unitario_q: item.precio_unitario_q,
                total_q: item.total_q,
                comisionable: item.comisionable,
                categoria_id: selectedCategories[idx] || null
            }))

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError

            setStep(3)
        } catch (err: any) {
            setError('Error al guardar en base de datos: ' + err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const resetWizard = () => {
        setStep(1)
        setUrl('')
        setObservations('')
        setPreviewData([])
        setSelectedCategories({})
        setPreviewData([])
        setSelectedCategories({})
        setAccountingMonth('')
        setAccountingYear('')
        setError(null)
    }

    return (
        <div className="grid gap-6">
            <div className="bg-card rounded-xl border border-border bg-white dark:bg-zinc-950 shadow-sm">
                <div className="p-6 border-b border-border flex flex-col items-start gap-1">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {step === 1 ? 'Nueva Factura' : step === 2 ? 'Categorización' : 'Completado'}
                    </h2>
                    <p className="text-sm text-zinc-500">
                        {step === 1
                            ? 'Sube el comprobante para análisis automático.'
                            : step === 2
                                ? 'Revisa los ítems y asigna categorías contables.'
                                : 'Factura procesada exitosamente.'}
                    </p>
                </div>

                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-6 mx-auto">
                            <div className="grid gap-3">
                                <Label htmlFor="url" className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                                    Link del Recibo <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-2.5 text-zinc-400">
                                        <span className="text-xs">🔗</span>
                                    </div>
                                    <Input
                                        id="url"
                                        placeholder="https://..."
                                        value={url}
                                        onChange={e => setUrl(e.target.value)}
                                        className="pl-9 h-10 bg-zinc-50/50 border-zinc-200 focus:border-zinc-400 focus:ring-0 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <Label htmlFor="obs" className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                                    Observaciones <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="obs"
                                    placeholder="Detalles para contabilidad..."
                                    value={observations}
                                    onChange={e => setObservations(e.target.value)}
                                    rows={3}
                                    className="resize-none min-h-[100px] bg-zinc-50/50 border-zinc-200 focus:border-zinc-400 focus:ring-0 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border shadow-sm text-center space-y-2">
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Ticket #</span>
                                    <p className="font-mono text-3xl font-bold text-zinc-800 dark:text-zinc-100">{previewData[0]?.ticket_numero}</p>
                                </div>
                                <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border shadow-sm text-center space-y-2">
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Fecha</span>
                                    <p className="text-xl font-medium text-zinc-800 dark:text-zinc-100">{previewData[0]?.fecha_venta_iso}</p>
                                </div>
                                <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border shadow-sm text-center space-y-2">
                                    <span className="text-xs text-blue-500 font-bold uppercase tracking-wider">Total</span>
                                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400">Q{previewData[0]?.total_q_factura?.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="border rounded-md overflow-x-auto bg-white dark:bg-zinc-900 shadow-sm">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50">
                                            <TableHead className="w-[35%]">Descripción</TableHead>
                                            <TableHead className="text-center w-[120px]">Comis.</TableHead>
                                            <TableHead className="w-[200px]">Categoría <span className="text-red-500">*</span></TableHead>
                                            <TableHead className="text-right">Cant.</TableHead>
                                            <TableHead className="text-right">P. Unit</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.map((item, idx) => (
                                            <TableRow key={idx} className="hover:bg-zinc-50/50 transition-colors">
                                                <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">{item.descripcion}</TableCell>
                                                <TableCell className="text-center">
                                                    {item.comisionable ? (
                                                        <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-red-500 mx-auto opacity-50" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <select
                                                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                                        value={selectedCategories[idx] || ''}
                                                        onChange={(e) => handleCategoryChange(idx, e.target.value)}
                                                    >
                                                        <option value="" disabled>Seleccionar...</option>
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </TableCell>
                                                <TableCell className="text-right">{item.cantidad}</TableCell>
                                                <TableCell className="text-right">Q{item.precio_unitario_q}</TableCell>
                                                <TableCell className="text-right font-bold">Q{item.total_q}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Selector de Mes Contable para Admins (Discreto) */}
                            {userRole === 'admin' && (
                                <div className="flex flex-col items-center justify-center gap-2 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800 w-full max-w-lg mx-auto">
                                    <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                                        Opciones Avanzadas (Admin)
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500 font-medium">Aplicar al cierre de:</span>
                                        <select
                                            className="h-8 text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 focus:ring-0 focus:border-zinc-400 cursor-pointer"
                                            value={accountingMonth}
                                            onChange={(e) => setAccountingMonth(e.target.value)}
                                        >
                                            <option value="">(Mes de Factura)</option>
                                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                                <option key={m} value={i}>{m}</option>
                                            ))}
                                        </select>
                                        <select
                                            className="h-8 text-xs bg-zinc-50 border border-zinc-200 rounded-md px-2 focus:ring-0 focus:border-zinc-400 cursor-pointer"
                                            value={accountingYear}
                                            onChange={(e) => setAccountingYear(e.target.value)}
                                        >
                                            <option value="">(Año)</option>
                                            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 max-w-sm text-center leading-tight">
                                        Si lo dejas en blanco, se guardará con la fecha original del ticket. Si seleccionas algo, contará para ese mes específico.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="py-12 text-center space-y-6">
                            <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-500" />
                            </div>
                            <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">¡Factura Guardada!</h3>
                            <p className="text-zinc-500 max-w-md mx-auto">
                                La información ha sido registrada correctamente.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
                            {error}
                        </div>
                    )}
                </div>

                <div className="border-t border-border p-6 flex justify-between bg-zinc-50/50 dark:bg-zinc-900/50 rounded-b-xl">
                    {step === 1 ? (
                        <Button
                            onClick={handleProcess}
                            disabled={isLoading || !url}
                            className="w-full max-w-xs mx-auto bg-zinc-900 text-white hover:bg-zinc-800"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analizando...
                                </>
                            ) : (
                                <>
                                    Procesar Recibo <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    ) : step === 2 ? (
                        <div className="flex w-full justify-between items-center">
                            <Button variant="ghost" onClick={() => setStep(1)} disabled={isLoading} className="text-zinc-500">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Atrás
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className="bg-zinc-900 text-white hover:bg-zinc-800"
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Confirmar Guardado
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={resetWizard}
                            className="w-full max-w-xs mx-auto bg-zinc-900 text-white hover:bg-zinc-800"
                        >
                            Procesar Nueva <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
