-- 💰 ACTUALIZACIÓN DE TABLA SETTLEMENTS 💰
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Agregar columnas para la meta mensual si no existen
DO $$ 
BEGIN 
    -- Columna para saber si alcanzó la meta (Boolean)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settlements' AND column_name='alcanzo_meta') THEN
        ALTER TABLE public.settlements ADD COLUMN alcanzo_meta BOOLEAN DEFAULT FALSE;
    END IF;

    -- Columna para el monto del bono (Numeric)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settlements' AND column_name='bono_meta_usd') THEN
        ALTER TABLE public.settlements ADD COLUMN bono_meta_usd NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Asegurarse de que el cache de Supabase reconozca el cambio
-- (A veces ayuda recargar la página del dashboard de Supabase después de esto)
NOTIFY pgrst, 'reload schema';
