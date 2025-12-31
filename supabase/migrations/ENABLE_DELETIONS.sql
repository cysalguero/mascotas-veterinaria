-- PERMITIR ELIMINACIÓN DE REGISTROS
-- Ejecuta esto en tu SQL Editor de Supabase

-- 1. POLÍTICAS PARA INVOICES (Facturas)
-- Permitir que usuarios autenticados eliminen facturas
DROP POLICY IF EXISTS "Permitir eliminar facturas" ON public.invoices;
CREATE POLICY "Permitir eliminar facturas" 
ON public.invoices 
FOR DELETE 
TO authenticated 
USING (true);

-- 2. POLÍTICAS PARA INVOICE_ITEMS (Items de Factura)
-- El delete cascade se encarga de los items, pero por seguridad permitimos el borrado
DROP POLICY IF EXISTS "Permitir eliminar items" ON public.invoice_items;
CREATE POLICY "Permitir eliminar items" 
ON public.invoice_items 
FOR DELETE 
TO authenticated 
USING (true);

-- 3. POLÍTICAS PARA SETTLEMENTS (Cierres/Pagos)
-- Aseguramos que se puedan eliminar cierres
DROP POLICY IF EXISTS "Permitir eliminar cierres" ON public.settlements;
CREATE POLICY "Permitir eliminar cierres" 
ON public.settlements 
FOR DELETE 
TO authenticated 
USING (true);

-- 4. VERIFICACIÓN DE GRANT
GRANT DELETE ON public.invoices TO authenticated;
GRANT DELETE ON public.invoice_items TO authenticated;
GRANT DELETE ON public.settlements TO authenticated;
