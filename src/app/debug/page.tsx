'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DebugPage() {
    const [clientResult, setClientResult] = useState<any>({ status: 'Waiting...' })
    const [serverResult, setServerResult] = useState<any>({ status: 'Waiting...' })
    const supabase = createClient()

    useEffect(() => {
        runClientDiagnostics()
    }, [])

    const runClientDiagnostics = async () => {
        setClientResult({ status: 'Running Client Test...' })
        // Test 1: Session
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        // Test 2: Categories Fetch
        const { data: categories, error: dbError } = await supabase
            .from('categories')
            .select('*')
            .limit(5)

        setClientResult({
            type: 'CLIENT-SIDE (Browser)',
            auth: {
                hasUser: !!user,
                userId: user?.id,
                error: authError
            },
            database: {
                success: !dbError,
                count: categories?.length,
                dataSample: categories,
                error: dbError
            }
        })
    }

    const runServerDiagnostics = async () => {
        setServerResult({ status: 'Running Server Test...' })
        try {
            const { testServerConnection } = await import('@/app/actions/debug-action')
            const data = await testServerConnection()
            setServerResult({ type: 'SERVER-SIDE (Node.js)', ...data })
        } catch (err: any) {
            setServerResult({
                type: 'SERVER-SIDE FAILURE',
                error: err.message,
                detail: 'Failed to import or run server action'
            })
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold mb-4">Diagnóstico Intensivo</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Cliente (Navegador)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-zinc-950 text-blue-400 p-4 rounded-md overflow-auto text-xs font-mono h-[300px]">
                            {JSON.stringify(clientResult, null, 2)}
                        </pre>
                        <Button onClick={runClientDiagnostics} className="mt-4 w-full" variant="outline">Re-probar Cliente</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Servidor (Node.js)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-zinc-950 text-orange-400 p-4 rounded-md overflow-auto text-xs font-mono h-[300px]">
                            {JSON.stringify(serverResult, null, 2)}
                        </pre>
                        <Button onClick={runServerDiagnostics} className="mt-4 w-full">Ejecutar Prueba de Servidor</Button>
                    </CardContent>
                </Card>
            </div>

            <div className="text-sm text-zinc-500">
                <p>Usa la "Prueba de Servidor" para ver si el problema es solo del navegador o de la conexión general.</p>
            </div>
        </div>
    )
}
