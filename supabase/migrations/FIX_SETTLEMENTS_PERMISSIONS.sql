-- FIX FOR PERMISSION DENIED IN SETTLEMENTS TABLE
-- Run this in your Supabase Dashboard SQL Editor

-- 1. Ensure the table has RLS enabled (or disabled if you want total freedom)
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.settlements;

-- 3. Create a wide-open policy for authenticated users (Admins)
CREATE POLICY "Enable all for authenticated users" 
ON public.settlements 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Grant explicit permissions to the authenticated role
GRANT ALL ON public.settlements TO authenticated;
GRANT ALL ON public.settlements TO service_role;

-- 5. Ensure the table owner is correct
ALTER TABLE public.settlements OWNER TO postgres;
