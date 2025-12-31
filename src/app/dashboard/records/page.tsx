import { InvoiceTable } from '@/components/invoices/invoice-table'

export default function RecordsPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Historial de Registros
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Visualiza, filtra y gestiona todas las facturas procesadas en el sistema.
                </p>
            </div>

            <div className="w-full">
                <InvoiceTable />
            </div>
        </div>
    )
}
