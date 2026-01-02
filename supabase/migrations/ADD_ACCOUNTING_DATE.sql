-- 1. Agregar columna fecha_contable a la tabla invoices
-- Esta columna servirá para asignar una factura a un mes diferente al de su emisión
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS fecha_contable DATE DEFAULT CURRENT_DATE;

-- 2. Actualizar los registros existentes
-- Para que no queden nulos, igualamos la fecha_contable a la fecha_venta original
UPDATE public.invoices 
SET fecha_contable = fecha_venta 
WHERE fecha_contable IS NULL;

-- 3. Crear índice para mejorar consultas de métricas por periodo
CREATE INDEX IF NOT EXISTS idx_invoices_fecha_contable ON public.invoices(fecha_contable);
