-- FIX FOR SETTLEMENTS CONSTRAINTS AND COLUMNS
-- Run this in your Supabase Dashboard SQL Editor

-- 1. Remove the strict check constraint on 'estado' to allow the new values
ALTER TABLE public.settlements DROP CONSTRAINT IF EXISTS settlements_estado_check;

-- 2. Add a more flexible check or just allow any text
ALTER TABLE public.settlements ADD CONSTRAINT settlements_estado_check 
CHECK (estado IN ('Pendiente', 'Calculado', 'Completado', 'Pagado', 'Anulado'));

-- 3. Add metodo_pago column if it somehow missed (safety check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settlements' AND column_name='metodo_pago') THEN
        ALTER TABLE public.settlements ADD COLUMN metodo_pago TEXT DEFAULT 'Efectivo';
    END IF;
END $$;

-- 4. Update existing records that might have null method
UPDATE public.settlements SET metodo_pago = 'Efectivo' WHERE metodo_pago IS NULL;

-- 5. Set the default for future records at the DB level
ALTER TABLE public.settlements ALTER COLUMN metodo_pago SET DEFAULT 'Efectivo';
ALTER TABLE public.settlements ALTER COLUMN estado SET DEFAULT 'Calculado';
