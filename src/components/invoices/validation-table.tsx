'use client'

import { useState, useEffect, Fragment } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Card,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronRight, CheckCircle, Loader2 } from 'lucide-react'
import { Invoice } from '@/types/invoices'
import { createClient } from '@/utils/supabase/client'

export function ValidationTable() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const supabase = createClient()

    useEffect(() => {
        fetchInvoices()

        // Realtime subscription
        const channel = supabase
            .channel('invoices_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'invoices',
                },
                () => {
                    fetchInvoices()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchInvoices = async () => {
        // Fetch invoices with status 'draft' and their items
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                invoice_items (*)
            `)
            .eq('status', 'draft')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching invoices:', error)
        } else {
            console.log('Fetched invoices:', data)
            setInvoices(data as Invoice[])
        }
        setIsLoading(false)
    }

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    const handleConfirm = async (id: string) => {
        const { error } = await supabase
            .from('invoices')
            .update({ status: 'confirmed' })
            .eq('id', id)

        if (error) {
            console.error('Error confirming invoice:', error)
            alert('Error al confirmar factura')
        } else {
            // UI update handled by Realtime, but for immediate feedback:
            setInvoices(invoices.filter(inv => inv.id !== id))
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-zinc-500">Cargando facturas...</div>
    }

    return (
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Ticket #</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Vendedor (Obs)</TableHead>
                        <TableHead className="text-right">Total (Q)</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-zinc-500">
                                No hay facturas pendientes de validación.
                            </TableCell>
                        </TableRow>
                    ) : invoices.map((invoice) => (
                        <Fragment key={invoice.id}>
                            <TableRow className="group">
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => toggleRow(invoice.id)}
                                    >
                                        {expandedRows.has(invoice.id) ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TableCell>
                                <TableCell className="font-medium">{invoice.ticket_numero}</TableCell>
                                <TableCell>{invoice.fecha_venta}</TableCell>
                                <TableCell>
                                    <Input
                                        className="h-8 w-[200px]"
                                        defaultValue={invoice.vendor || ''}
                                    />
                                </TableCell>
                                <TableCell className="text-right font-bold text-lg">
                                    Q{invoice.total_q?.toFixed(2) || '0.00'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
                                        Borrador
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => handleConfirm(invoice.id)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Confirmar
                                    </Button>
                                </TableCell>
                            </TableRow>
                            {expandedRows.has(invoice.id) && (
                                <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-50/50">
                                    <TableCell colSpan={7} className="p-4">
                                        <div className="rounded-md border bg-white dark:bg-zinc-950 p-4">
                                            <h4 className="mb-4 text-sm font-semibold tracking-tight">Ítems de Factura</h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="border-b-0">
                                                        <TableHead>Descripción</TableHead>
                                                        <TableHead className="w-[100px] text-right">Cant.</TableHead>
                                                        <TableHead className="w-[120px] text-right">Precio U.</TableHead>
                                                        <TableHead className="w-[120px] text-right">Total</TableHead>
                                                        <TableHead className="w-[150px]">Categoría</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {invoice.invoice_items && invoice.invoice_items.length > 0 ? (
                                                        invoice.invoice_items.map((item) => (
                                                            <TableRow key={item.id} className="border-b-0">
                                                                <TableCell>
                                                                    <Input className="h-8" defaultValue={item.descripcion} />
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Input className="h-8 text-right" type="number" defaultValue={item.cantidad} />
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Input className="h-8 text-right" type="number" defaultValue={item.precio_unitario_q} />
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    Q{item.total_q?.toFixed(2) || '0.00'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <select className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                                                        <option>Farmacia</option>
                                                                        <option>Consulta</option>
                                                                        <option>Insumos</option>
                                                                        <option>Laboratorio</option>
                                                                    </select>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center text-sm text-zinc-500">No hay ítems registrados.</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </Card>
    )
}
