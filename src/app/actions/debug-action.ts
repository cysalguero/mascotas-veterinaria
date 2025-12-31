'use server'

import { createClient } from '@/utils/supabase/server'

export async function testServerConnection() {
    const supabase = await createClient()

    // Test 1: Check Auth (Session)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Test 2: Fetch Categories
    const { data: categories, error: dbError } = await supabase
        .from('categories')
        .select('*')
        .limit(5)

    return {
        timestamp: new Date().toISOString(),
        environment: {
            urlConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
            keyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        auth: {
            hasUser: !!user,
            userId: user?.id,
            error: authError ? JSON.stringify(authError) : null
        },
        database: {
            success: !dbError,
            count: categories?.length || 0,
            dataSample: categories,
            error: dbError ? JSON.stringify(dbError) : null
        }
    }
}
