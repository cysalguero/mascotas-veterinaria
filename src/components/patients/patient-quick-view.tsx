import { useState, useEffect } from 'react'
import { User, CheckCircle, XCircle, Calendar, Phone, Mail, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { differenceInYears, differenceInMonths } from 'date-fns'

import { PatientAvatar } from './patient-avatar'

function calculateAge(birthDateStr?: string) {
    if (!birthDateStr) return ''
    try {
        const birthDate = new Date(birthDateStr)
        const now = new Date()
        const years = differenceInYears(now, birthDate)
        if (years > 0) return `${years} años`
        const months = differenceInMonths(now, birthDate)
        return `${months} meses`
    } catch (e) {
        return ''
    }
}

/* --------------------------------------------------------------------------------
 * Component Props Interface
 * -------------------------------------------------------------------------------- */
// Based on VetesoftPatient interface
export interface PatientData {
    id_animal: number
    paciente: string
    especie: string
    raza: string
    nacido?: string
    sexo?: string
    color?: string
    propietario: string
    documento?: string
    direccion?: string
    telefono?: string
    email?: string
    fec_crea?: string
    es_vacunal?: string
    es_antipara?: string
    alert_info?: string
}

interface PatientQuickViewProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    patients: PatientData[]
}

export function PatientQuickView({ isOpen, onOpenChange, patients }: PatientQuickViewProps) {
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0)
        }
    }, [isOpen, patients])

    if (!patients || patients.length === 0) return null

    const patient = patients[currentIndex]
    const age = calculateAge(patient.nacido)
    const hasMultiple = patients.length > 1

    const handlePrev = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : patients.length - 1))
    }

    const handleNext = () => {
        setCurrentIndex(prev => (prev < patients.length - 1 ? prev + 1 : 0))
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl">
                <div className="relative">
                    {/* Background Pattern */}
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-900/10 z-0" />

                    <div className="relative z-10 p-6 flex flex-col items-center text-center space-y-4 pt-10">

                        {/* Navigation Arrows */}
                        {hasMultiple && (
                            <div className="absolute top-8 w-full px-4 flex justify-between z-20">
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/50 backdrop-blur hover:bg-white" onClick={handlePrev}>
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/50 backdrop-blur hover:bg-white" onClick={handleNext}>
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                        )}

                        {/* Huge Avatar */}
                        <PatientAvatar
                            id_animal={patient.id_animal}
                            especie={patient.especie}
                            size="xl"
                            className="shadow-xl border-4 border-white dark:border-zinc-900 transform hover:scale-105 transition-transform duration-300 rounded-3xl"
                        />

                        {hasMultiple && (
                            <div className="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                {currentIndex + 1} / {patients.length}
                            </div>
                        )}

                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                {patient.paciente}
                            </DialogTitle>
                            <div className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                <span className="uppercase tracking-wide text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                    {patient.especie}
                                </span>
                                <span>•</span>
                                <span>{patient.raza}</span>
                                {age && (
                                    <>
                                        <span>•</span>
                                        <span>{age}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Status Pills */}
                        <div className="flex flex-wrap justify-center gap-2 w-full pt-2">
                            <div className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-1.5 ${patient.es_vacunal?.toLowerCase().includes('no')
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                }`}>
                                {patient.es_vacunal?.toLowerCase().includes('no')
                                    ? <XCircle size={14} className="stroke-[3]" />
                                    : <CheckCircle size={14} className="stroke-[3]" />
                                }
                                {patient.es_vacunal || 'Vacunación Desconocida'}
                            </div>

                            {patient.es_antipara && (
                                <div className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 shadow-sm">
                                    Desparasitación: {patient.es_antipara}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Card */}
                    <div className="bg-zinc-50/80 dark:bg-zinc-900/50 p-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">

                        {/* Owner Info */}
                        <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-3">
                            <div className="flex items-start gap-4">
                                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-full text-indigo-600 dark:text-indigo-400 mt-1">
                                    <User size={16} />
                                </div>
                                <div className="flex-1 space-y-0.5">
                                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Propietario</p>
                                    <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{patient.propietario}</p>
                                    {patient.documento && <p className="text-xs text-zinc-400 font-mono">ID: {patient.documento}</p>}
                                </div>
                                <div className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expediente</p>
                                    <p className="font-mono text-sm font-bold text-zinc-600 dark:text-zinc-400">#{patient.id_animal}</p>
                                </div>
                            </div>

                            {/* Contact Details (if available) */}
                            {(patient.telefono || patient.email || patient.direccion) && (
                                <div className="pt-3 border-t border-dashed border-zinc-100 dark:border-zinc-800 grid grid-cols-1 gap-2">
                                    {patient.telefono && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Phone size={12} className="text-zinc-400" />
                                            <span>{patient.telefono}</span>
                                        </div>
                                    )}
                                    {patient.email && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Mail size={12} className="text-zinc-400" />
                                            <span className="truncate">{patient.email}</span>
                                        </div>
                                    )}
                                    {patient.direccion && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <MapPin size={12} className="text-zinc-400" />
                                            <span className="truncate">{patient.direccion}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Additional Vetesoft Info */}
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase">Sexo</p>
                                <p className="font-medium text-zinc-700 dark:text-zinc-300 text-sm capitalize">{patient.sexo || 'N/A'}</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase">Color</p>
                                <p className="font-medium text-zinc-700 dark:text-zinc-300 text-sm capitalize">{patient.color || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
