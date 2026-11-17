-- AGREGAR COMIDA MES SIGUIENTE Y AUXILIO DE TRANSPORTE A SETTLEMENTS (DESDE ENERO 2026)
-- Ejecuta este script en el SQL Editor de Supabase

DO $$
DECLARE
    v_added_columns BOOLEAN := FALSE;
BEGIN
    -- 1. Columna para comida del mes siguiente en quetzales
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'settlements'
          AND column_name = 'comida_mes_siguiente_q'
    ) THEN
        ALTER TABLE public.settlements
            ADD COLUMN comida_mes_siguiente_q NUMERIC(10,2) NOT NULL DEFAULT 0;
        v_added_columns := TRUE;
    END IF;

    -- 2. Columna para auxilio de transporte del mes siguiente en quetzales
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'settlements'
          AND column_name = 'auxilio_transporte_q'
    ) THEN
        ALTER TABLE public.settlements
            ADD COLUMN auxilio_transporte_q NUMERIC(10,2) NOT NULL DEFAULT 0;
        v_added_columns := TRUE;
    END IF;

    -- 3. Retroactivo desde enero 2026 (solo la primera vez que se crean las columnas)
    IF v_added_columns THEN
        UPDATE public.settlements
        SET
            comida_mes_siguiente_q = 750.00,
            auxilio_transporte_q = 250.00,
            total_quetzales = ROUND(
                ROUND((COALESCE(sueldo_proporcional_usd, 0) * COALESCE(tipo_cambio, 7.5))::numeric, 2)
                + ROUND(COALESCE(comision_quetzales, 0)::numeric, 2)
                + ROUND((COALESCE(bono_meta_usd, 0) * COALESCE(tipo_cambio, 7.5))::numeric, 2)
                + 750.00
                + 250.00,
                2
            ),
            total_usd = CASE
                WHEN COALESCE(tipo_cambio, 0) > 0 THEN ROUND(
                    (
                        ROUND((COALESCE(sueldo_proporcional_usd, 0) * tipo_cambio)::numeric, 2)
                        + ROUND(COALESCE(comision_quetzales, 0)::numeric, 2)
                        + ROUND((COALESCE(bono_meta_usd, 0) * tipo_cambio)::numeric, 2)
                        + 750.00
                        + 250.00
                    ) / tipo_cambio,
                    2
                )
                ELSE COALESCE(total_usd, 0)
            END
        WHERE anio >= 2026;
    END IF;
END $$;

-- 4. Sembrar configuración por defecto de viáticos en app_settings
INSERT INTO public.app_settings (key, value)
VALUES (
    'settlement_allowances',
    '{"defaults": {"comida_q": 750, "transporte_q": 250}, "overrides": {}}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 5. Permitir INSERT a administradores en app_settings (si aún no existe la política)
DROP POLICY IF EXISTS "Enable insert for admins" ON public.app_settings;
CREATE POLICY "Enable insert for admins" ON public.app_settings
    FOR INSERT WITH CHECK (
        exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );

-- 6. Recargar cache del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
