export type InvoiceStatus = 'draft' | 'confirmed'

export interface InvoiceItem {
    id: string
    invoice_id: string
    descripcion: string
    cantidad: number
    precio_unitario_q: number
    total_q: number
    comisionable: boolean
    categoria_id?: string
}

export interface Invoice {
    id: string
    ticket_numero: number
    fecha_venta: string // Date string YYYY-MM-DD
    forma_pago: string
    vendor?: string // 'observaciones_doctora' or specific vendor logic if added
    subtotal_q: number
    total_q: number
    pagado_q: number
    cambio_q: number
    doctor_id: string
    status: InvoiceStatus
    file_url?: string

    // Virtual field for UI (nested items)
    invoice_items: InvoiceItem[]
}

// Mock updated to match Spanish schema
export const mockInvoices: Invoice[] = [
    {
        id: '1',
        ticket_numero: 1024,
        fecha_venta: '2023-12-28',
        forma_pago: 'Efectivo',
        vendor: 'Distribuidora Vet',
        subtotal_q: 450.00,
        total_q: 450.00,
        pagado_q: 500.00,
        cambio_q: 50.00,
        doctor_id: 'user-uuid-1',
        status: 'draft',
        invoice_items: [
            { id: '101', invoice_id: '1', descripcion: 'Vacuna Rabia x10', cantidad: 10, precio_unitario_q: 25.00, total_q: 250.00, comisionable: true },
            { id: '102', invoice_id: '1', descripcion: 'Jeringas 5ml', cantidad: 100, precio_unitario_q: 2.00, total_q: 200.00, comisionable: false }
        ]
    },
    {
        id: '2',
        ticket_numero: 1025,
        fecha_venta: '2023-12-29',
        forma_pago: 'Tarjeta',
        vendor: 'Laboratorio X',
        subtotal_q: 1200.00,
        total_q: 1200.00,
        pagado_q: 1200.00,
        cambio_q: 0.00,
        doctor_id: 'user-uuid-1',
        status: 'draft',
        invoice_items: [
            { id: '201', invoice_id: '2', descripcion: 'Análisis de Sangre Completo', cantidad: 1, precio_unitario_q: 1200.00, total_q: 1200.00, comisionable: true }
        ]
    }
]
