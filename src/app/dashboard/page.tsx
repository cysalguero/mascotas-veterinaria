import { InvoiceWizard } from '@/components/invoices/invoice-wizard'

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-6">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Validación de Facturas
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Procesa tus recibos y organiza la contabilidad de la clínica de forma fácil.
          </p>
        </div>

        <div className="w-full">
          <InvoiceWizard />
        </div>
      </div>
    </div>
  )
}
