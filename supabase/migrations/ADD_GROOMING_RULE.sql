-- REGLA CONFIGURABLE: NINGÚN GROOMING ES COMISIONABLE
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Sembrar la regla en app_settings (activada por defecto: SÍ bloquear comisiones en Grooming)
INSERT INTO public.app_settings (key, value)
VALUES (
    'grooming_commission_rule',
    '{"block_grooming": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 2. Corregir ítems históricos cuya categoría sea Grooming y hayan quedado marcados comisionable = true
UPDATE public.invoice_items ii
SET comisionable = false
FROM public.categories c
WHERE ii.categoria_id = c.id
  AND LOWER(c.name) LIKE '%grooming%'
  AND ii.comisionable = true;

NOTIFY pgrst, 'reload schema';
