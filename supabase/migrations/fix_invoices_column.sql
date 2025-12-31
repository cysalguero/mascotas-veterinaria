-- Agregamos la columna file_url a la tabla invoices si no existe
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS file_url text;
