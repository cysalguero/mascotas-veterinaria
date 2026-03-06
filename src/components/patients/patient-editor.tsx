'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Loader2, CheckCircle, XCircle, User, Plus, Trash2 } from 'lucide-react'
import { searchPatients, VetesoftPatient } from '@/actions/vetesoft'
import { updateInvoicePatients } from '@/actions/invoices'

import { PatientAvatar } from './patient-avatar'
// ----------------------------------------------------------------------

interface PatientEditorProps {
    invoiceId: string
    initialPatients?: VetesoftPatient[] | null
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function PatientEditor({
    invoiceId,
    initialPatients,
    isOpen,
    onOpenChange,
    onSuccess
}: PatientEditorProps) {
    const [selectedPatients, setSelectedPatients] = useState<VetesoftPatient[]>([])
    // Search State
    const [searchTerm, setSearchTerm] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState<VetesoftPatient[]>([])
    const [isSaving, setIsSaving] = useState(false)

    // Init state when opening
    useEffect(() => {
        if (isOpen) {
            setSelectedPatients(initialPatients || [])
            setSearchTerm('')
            setSearchResults([])
        }
    }, [isOpen, initialPatients])

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length >= 2) {
                performSearch()
            } else {
                setSearchResults([])
            }
        }, 600)
        return () => clearTimeout(timer)
    }, [searchTerm])

    const performSearch = async () => {
        setIsSearching(true)
        try {
            const results = await searchPatients(searchTerm)
            setSearchResults(results)
        } catch (error) {
            console.error(error)
        } finally {
            setIsSearching(false)
        }
    }

    const addPatient = (patient: VetesoftPatient) => {
        if (selectedPatients.some(p => p.id_animal === patient.id_animal)) return
        setSelectedPatients(prev => [...prev, patient])
        setSearchTerm('')
        setSearchResults([])
    }

    const removePatient = (id: number) => {
        setSelectedPatients(prev => prev.filter(p => p.id_animal !== id))
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateInvoicePatients(invoiceId, selectedPatients)
            if (onSuccess) onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            alert('Error al guardar: ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-0 overflow-hidden flex flex-col max-h-[85vh]">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <User className="h-5 w-5 text-indigo-500" />
                        Editar Pacientes
                    </DialogTitle>
                    <DialogDescription>
                        Vincula o desvincula pacientes de esta factura.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* LIST OF SELECTED PATIENTS */}
                    <div className="space-y-3">
                        <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                            Pacientes Vinculados ({selectedPatients.length})
                        </Label>

                        {selectedPatients.length === 0 ? (
                            <div className="py-8 text-center bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                <p className="text-sm text-zinc-500 font-medium">No hay pacientes vinculados.</p>
                                <p className="text-xs text-zinc-400 mt-1">Usa el buscador para agregar uno.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {selectedPatients.map(patient => (
                                    <div key={patient.id_animal} className="flex items-center justify-between p-3 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl group">
                                        <div className="flex items-center gap-3">
                                            <PatientAvatar
                                                id_animal={patient.id_animal}
                                                especie={patient.especie}
                                                size="md"
                                                className="rounded-lg shadow-sm border border-black/5"
                                            />
                                            <div>
                                                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{patient.paciente}</p>
                                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                    <span>Prop: {patient.propietario}</span>
                                                    <span className="text-zinc-300">•</span>
                                                    <span className="font-mono">ID:{patient.id_animal}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removePatient(patient.id_animal)}
                                            className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SEARCH INPUT */}
                    <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                            Agregar Paciente
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                            <Input
                                placeholder="Buscar por nombre, dueño o ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 h-10 bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800"
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                </div>
                            )}
                        </div>

                        {/* SEARCH RESULTS */}
                        {searchResults.length > 0 && (
                            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-lg max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                {searchResults.map(patient => {
                                    const isSelected = selectedPatients.some(p => p.id_animal === patient.id_animal)
                                    return (
                                        <button
                                            key={patient.id_animal}
                                            onClick={() => !isSelected && addPatient(patient)}
                                            disabled={isSelected}
                                            className={`w-full text-left flex items-center justify-between p-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors
                                                ${isSelected
                                                    ? 'bg-zinc-50/80 dark:bg-zinc-900/80 opacity-60 cursor-default'
                                                    : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 bg-white dark:bg-zinc-950 cursor-pointer'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <PatientAvatar
                                                    id_animal={patient.id_animal}
                                                    especie={patient.especie}
                                                    size="sm"
                                                    className="shadow-sm border border-black/5"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold truncate">{patient.paciente}</p>
                                                    <p className="text-[10px] text-zinc-500 truncate">{patient.propietario} • {patient.raza}</p>
                                                </div>
                                            </div>
                                            {isSelected ? (
                                                <CheckCircle size={16} className="text-zinc-300" />
                                            ) : (
                                                <Plus size={16} className="text-indigo-500" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
