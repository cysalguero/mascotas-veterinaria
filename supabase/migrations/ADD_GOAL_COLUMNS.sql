-- AGREGAR COLUMNAS PARA META MENSUAL
-- Ejecuta esto en tu SQL Editor de Supabase

DO $$ 
BEGIN 
    -- 1. Columna para saber si alcanzó la meta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settlements' AND column_name='alcanzo_meta') THEN
        ALTER TABLE public.settlements ADD COLUMN alcanzo_meta BOOLEAN DEFAULT FALSE;
    END IF;

    -- 2. Columna para el monto del bono (si aplica)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settlements' AND column_name='bono_meta_usd') THEN
        ALTER TABLE public.settlements ADD COLUMN bono_meta_usd NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;
