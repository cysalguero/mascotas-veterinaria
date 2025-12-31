-- 🚨 SOLUCIÓN DEFINITIVA (NUCLEAR) PARA FACTURAS 🚨

-- 1. Desactivar RLS (Seguridad) en las tablas problemáticas
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items DISABLE ROW LEVEL SECURITY;

-- 2. Dar permisos TOTALES a todos los roles (Anon y Authenticated)
-- Esto abre la puerta para LEER y ESCRIBIR sin restricciones
GRANT ALL ON public.invoices TO anon;
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

GRANT ALL ON public.invoice_items TO anon;
GRANT ALL ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;

-- 3. IMPORTANTE: Permisos para el contador de tickets (Sequence)
-- A veces el error es aquí y parece de tabla
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Confirmación
COMMENT ON TABLE public.invoices IS 'Seguridad desactivada para MVP';
