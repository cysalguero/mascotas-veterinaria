-- 1. Habilitar RLS (Seguridad) en las tablas
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas anteriores para evitar errores de "already exists"
DROP POLICY IF EXISTS "Permitir insertar a doctores" ON public.invoices;
DROP POLICY IF EXISTS "Permitir ver facturas" ON public.invoices;
DROP POLICY IF EXISTS "Permitir insertar items" ON public.invoice_items;
DROP POLICY IF EXISTS "Permitir ver items" ON public.invoice_items;

-- 3. POLÍTICAS PARA INVOICES (Encabezados)

-- Permitir INSERTAR (Guardar) a cualquier usuario logueado
CREATE POLICY "Permitir insertar a doctores" 
ON public.invoices 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Permitir LEER (Ver) las facturas (necesario para que el INSERT devuelva datos)
CREATE POLICY "Permitir ver facturas" 
ON public.invoices 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. POLÍTICAS PARA INVOICE_ITEMS (Detalles)

-- Permitir INSERTAR items
CREATE POLICY "Permitir insertar items" 
ON public.invoice_items 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Permitir LEER items
CREATE POLICY "Permitir ver items" 
ON public.invoice_items 
FOR SELECT 
TO authenticated 
USING (true);

-- 5. Dar permisos básicos de GRÁNT (por si faltan)
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoice_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE invoices_ticket_numero_seq TO authenticated; 
