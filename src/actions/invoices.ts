'use server'

import { createClient } from '@/utils/supabase/server'
import { VetesoftPatient } from './vetesoft'

export async function updateInvoicePatients(invoiceId: string, patients: VetesoftPatient[]) {
    const supabase = await createClient()

    // Logic for derived fields:
    // 1. Name: Comma-separated or "Patient + X others"
    let patientName = null
    if (patients.length > 0) {
        if (patients.length <= 2) {
            patientName = patients.map(p => p.paciente).join(', ')
        } else {
            patientName = `${patients[0].paciente} + ${patients.length - 1} más`
        }
    }

    // 2. History Number: Comma-separated
    let historyNumber = null
    if (patients.length > 0) {
        historyNumber = patients.map(p => p.id_animal).join(', ')
    }

    // 3. Species & Owner: Based on PRIMARY patient (first one)
    // This simplifies analytics. If mixed species, the invoice counts towards the first one.
    const primaryPatient = patients.length > 0 ? patients[0] : null
    const patientSpecies = primaryPatient ? primaryPatient.especie : null
    const patientOwner = primaryPatient ? primaryPatient.propietario : null

    // A. Update 'invoices' table (Cache + JSON for QuickView compatibility)
    const { error: updateError } = await supabase
        .from('invoices')
        .update({
            patient_name: patientName,
            patient_history_number: historyNumber,
            patient_data: patients.length > 0 ? patients : null, // keep JSON cache specifically for frontend quick usage
            patient_species: patientSpecies,
            patient_owner: patientOwner
        })
        .eq('id', invoiceId)

    if (updateError) {
        throw new Error('Error updating invoice cache: ' + updateError.message)
    }

    // B. Sync 'invoice_patients' table (Relational Source of Truth)
    // 1. Delete existing links
    const { error: deleteError } = await supabase
        .from('invoice_patients')
        .delete()
        .eq('invoice_id', invoiceId)

    if (deleteError) {
        throw new Error('Error clearing old patient links: ' + deleteError.message)
    }

    // 2. Insert new links
    if (patients.length > 0) {
        const { error: insertError } = await supabase
            .from('invoice_patients')
            .insert(patients.map(p => ({
                invoice_id: invoiceId,
                patient_id: p.id_animal.toString(),
                patient_name: p.paciente,
                patient_species: p.especie,
                patient_owner: p.propietario,
                patient_data: p
            })))

        if (insertError) {
            throw new Error('Error creating new patient links: ' + insertError.message)
        }
    }

    return { success: true }
}
