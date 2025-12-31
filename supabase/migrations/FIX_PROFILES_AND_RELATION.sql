-- 🏥 RESTAURAR TABLA DE PERFILES (DOCTORES) 🏥

-- 1. Crear la tabla if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Desactivar RLS para evitar errores de permisos por ahora (Nuclear)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 3. Crear relación en la tabla de facturas (si no existe)
-- Nota: Si doctor_id ya está como UUID, esto solo asegura el link
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_doctor_id_fkey,
ADD CONSTRAINT invoices_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES auth.users(id);

-- 4. Comentario
COMMENT ON TABLE public.profiles IS 'Almacena nombres de doctores vinculados a auth.users';
