'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, CheckCircle, ArrowRight, ArrowLeft, XCircle, Search, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { searchPatients } from '@/actions/vetesoft'
import { PatientAvatar } from '@/components/patients/patient-avatar'

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

interface VetesoftPatient {
    id_animal: number
    paciente: string
    especie: string
    raza: string
    nacido: string
    sexo: string
    color: string
    propietario: string
    documento: string
    direccion: string
    telefono: string
    email: string
    fec_crea: string
    // New fields linked to API response
    es_vacunal?: string
    es_antipara?: string
    alert_info?: string
}

// ----------------------------------------------------------------------



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

    // Patient Search State
    const [patientSearchTerm, setPatientSearchTerm] = useState('')
    const [searchTermDebounced, setSearchTermDebounced] = useState('')
    const [isSearchingPatient, setIsSearchingPatient] = useState(false)
    const [patientResults, setPatientResults] = useState<VetesoftPatient[]>([])
    const [selectedPatients, setSelectedPatients] = useState<VetesoftPatient[]>([])
    const [isSkipped, setIsSkipped] = useState(false)
    const [showPatientResults, setShowPatientResults] = useState(false)

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

    useEffect(() => {
        const timer = setTimeout(() => {
            if (patientSearchTerm.length >= 2) {
                performSearch(patientSearchTerm)
            } else {
                setPatientResults([])
            }
        }, 800) // 800ms debounce

        return () => clearTimeout(timer)
    }, [patientSearchTerm])

    const performSearch = async (term: string) => {
        setIsSearchingPatient(true)
        try {
            const results = await searchPatients(term)
            setPatientResults(results)
            setShowPatientResults(true)
        } catch (err) {
            console.error(err)
        } finally {
            setIsSearchingPatient(false)
        }
    }

    const addPatient = (patient: VetesoftPatient) => {
        // Prevent duplicates
        if (selectedPatients.some(p => p.id_animal === patient.id_animal)) return

        setSelectedPatients(prev => [...prev, patient])
        setPatientSearchTerm('')
        setShowPatientResults(false)
        setIsSkipped(false)
    }

    const removePatient = (id: number) => {
        setSelectedPatients(prev => prev.filter(p => p.id_animal !== id))
    }

    const toggleSkipped = () => {
        if (!isSkipped) {
            setSelectedPatients([])
            setIsSkipped(true)
        } else {
            setIsSkipped(false)
        }
    }

    const handleProcess = async () => {
        setIsLoading(true)
        setError(null)

        try {
            if (!url.trim()) throw new Error("⚠️ El link del recibo es obligatorio.")
            if (!observations.trim()) throw new Error("⚠️ Las observaciones son obligatorias.")
            if (!observations.trim()) throw new Error("⚠️ Las observaciones son obligatorias.")
            if (selectedPatients.length === 0 && !isSkipped) throw new Error("⚠️ Debes vincular al menos un paciente o seleccionar 'No Aplica'.")

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

            // --- VALIDACIÓN DE DÍA ACTUAL O AYER ---
            const [invYear, invMonth, invDay] = header.fecha_venta_iso.split('-').map(Number)

            // Fecha de la factura a las 00:00:00 local
            const invoiceDate = new Date(invYear, invMonth - 1, invDay)

            // Fecha de hoy a las 00:00:00 local
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            // Fecha de ayer a las 00:00:00 local
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)

            const isToday = invoiceDate.getTime() === today.getTime()
            const isYesterday = invoiceDate.getTime() === yesterday.getTime()

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
                // Si es doctor, restringir a HOY o AYER
                if (!isToday && !isYesterday) {
                    const currentDay = today.getDate()
                    const currentMonth = today.getMonth() + 1
                    const currentYear = today.getFullYear()
                    throw new Error(`⚠️ No se puede guardar. La factura es del ${invDay}/${invMonth}/${invYear} y hoy es ${currentDay}/${currentMonth}/${currentYear}. Tienes hasta 1 día después de la fecha de la factura para registrarla.`)
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
                    fecha_contable: finalAccountingDate, // Guardamos la fecha contable

                    // Vetesoft Data Integration
                    // Vetesoft Data Integration (Multi-Patient Logic)
                    patient_name: selectedPatients.length > 0
                        ? (selectedPatients.length <= 2
                            ? selectedPatients.map(p => p.paciente).join(', ')
                            : `${selectedPatients[0].paciente} + ${selectedPatients.length - 1} más`)
                        : null,
                    patient_history_number: selectedPatients.length > 0
                        ? selectedPatients.map(p => p.id_animal).join(', ')
                        : null,
                    patient_data: selectedPatients.length > 0 ? selectedPatients : null,
                    patient_species: selectedPatients.length > 0 ? selectedPatients[0].especie : null,
                    patient_owner: selectedPatients.length > 0 ? selectedPatients[0].propietario : null,
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

            // Insert into invoice_patients (New Relational Table)
            if (selectedPatients.length > 0) {
                const patientsToInsert = selectedPatients.map(p => ({
                    invoice_id: invoice.id,
                    patient_id: p.id_animal.toString(),
                    patient_name: p.paciente,
                    patient_species: p.especie,
                    patient_owner: p.propietario,
                    patient_data: p
                }))

                const { error: patientsError } = await supabase
                    .from('invoice_patients')
                    .insert(patientsToInsert)

                if (patientsError) throw patientsError
            }

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
        setAccountingMonth('')
        setAccountingYear('')
        setPatientSearchTerm('')
        setPatientResults([])
        setSelectedPatients([])
        setIsSkipped(false)
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

                            {/* Buscador de Pacientes Vetesoft - PREMIUM UI */}
                            <div className="pt-6 border-t border-dashed border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                                <Label className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
                                            <User size={18} />
                                        </div>
                                        <span>Vincular Paciente</span>
                                        <span className="text-red-500">*</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={toggleSkipped}
                                        className={`text-xs font-bold border-dashed ${isSkipped
                                            ? 'bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100'
                                            : 'text-zinc-400 border-zinc-200 hover:border-zinc-300 dark:border-zinc-800'}`}
                                    >
                                        {isSkipped ? 'Habilitar Vinculación' : 'No Aplica'}
                                    </Button>
                                </Label>

                                {/* Selected Patients List (Chips) */}
                                {selectedPatients.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 animate-in slide-in-from-bottom-2">
                                        {selectedPatients.map(patient => (
                                            <div key={patient.id_animal} className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-xl border border-indigo-100 dark:border-indigo-900/40 shadow-sm group">
                                                <div className="p-3 flex items-center gap-3">
                                                    <PatientAvatar
                                                        id_animal={patient.id_animal}
                                                        especie={patient.especie}
                                                        size="md"
                                                        className="rounded-lg shadow-sm border border-black/5"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{patient.paciente}</h4>
                                                        <p className="text-[10px] text-zinc-500 truncate">{patient.propietario} • ID:{patient.id_animal}</p>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => removePatient(patient.id_animal)}
                                                        className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <XCircle size={16} />
                                                    </Button>
                                                </div>
                                                {/* Status Bar */}
                                                <div className={`h-1 w-full ${patient.es_vacunal?.toLowerCase().includes('no') ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isSkipped && (
                                    <div className="relative group z-20">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur-sm"></div>
                                        <div className="relative bg-white dark:bg-zinc-950 rounded-xl flex items-center shadow-sm">
                                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-zinc-400 group-hover:text-indigo-500 transition-colors duration-300" />
                                            <Input
                                                placeholder="Buscar por Nombre, Dueño o ID..."
                                                value={patientSearchTerm}
                                                onChange={e => setPatientSearchTerm(e.target.value)}
                                                onFocus={() => {
                                                    if (patientSearchTerm.length >= 2) setShowPatientResults(true)
                                                }}
                                                className="pl-12 h-12 bg-transparent border-zinc-200 focus:border-transparent focus:ring-0 text-base rounded-xl transition-all font-medium placeholder:text-zinc-400/80"
                                            />
                                            {isSearchingPatient && (
                                                <div className="absolute right-4 top-3.5 animate-spin text-indigo-500">
                                                    <Loader2 className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Dropdown Results */}
                                        {showPatientResults && patientResults.length > 0 && (
                                            <div className="absolute top-14 left-0 w-full bg-white/90 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800 rounded-xl shadow-2xl max-h-[320px] overflow-y-auto z-50 p-2 space-y-1 custom-scrollbar animate-in zoom-in-95 duration-200">
                                                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm z-10 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                                                    Resultados encontrados
                                                </div>
                                                {patientResults.map((patient) => {
                                                    const isSelected = selectedPatients.some(p => p.id_animal === patient.id_animal)
                                                    return (
                                                        <div
                                                            key={patient.id_animal}
                                                            onClick={() => !isSelected && addPatient(patient)}
                                                            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 group/item border border-transparent 
                                                                ${isSelected
                                                                    ? 'opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900'
                                                                    : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-100 dark:hover:border-indigo-900/30'}`}
                                                        >
                                                            <PatientAvatar
                                                                id_animal={patient.id_animal}
                                                                especie={patient.especie}
                                                                size="lg"
                                                                className="shadow-sm border border-black/5"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="font-bold text-zinc-800 dark:text-zinc-100 group-hover/item:text-indigo-700 dark:group-hover/item:text-indigo-300 truncate">
                                                                        {patient.paciente}
                                                                    </p>
                                                                    <span className="text-[10px] font-mono font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                                        ID:{patient.id_animal}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                                                                    <User size={10} />
                                                                    {patient.propietario}
                                                                    <span className="mx-1 text-zinc-300">•</span>
                                                                    {patient.raza}
                                                                </p>
                                                            </div>
                                                            {isSelected && <CheckCircle size={16} className="text-zinc-300" />}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isSkipped && (
                                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center animate-in fade-in zoom-in-95">
                                        <p className="text-sm font-medium text-zinc-500">
                                            No se vinculará ningún paciente a esta factura.
                                        </p>
                                    </div>
                                )}
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

                            {/* Mostrar Paciente Seleccionado en Paso 2 también (Read Only) */}
                            {/* Mostrar Pacientes Seleccionados en Paso 2 también (Read Only) */}
                            {selectedPatients.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase text-zinc-400 tracking-wider">Pacientes Vinculados</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {selectedPatients.map(p => (
                                            <div key={p.id_animal} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                                <PatientAvatar
                                                    id_animal={p.id_animal}
                                                    especie={p.especie}
                                                    size="sm"
                                                    className="shadow-sm border border-black/5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{p.paciente}</p>
                                                    <p className="text-[10px] text-zinc-500 truncate">ID #{p.id_animal}</p>
                                                </div>
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
