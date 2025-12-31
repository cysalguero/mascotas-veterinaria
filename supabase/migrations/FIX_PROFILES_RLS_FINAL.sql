-- 🚨 FIX PERMISOS DE PERFILES (SUPABASE) 🚨
-- Ejecuta esto en el SQL Editor de tu Dashboard de Supabase

-- 1. Habilitar RLS (Seguridad a nivel de fila)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas viejas para evitar duplicados
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 3. Política de LECTURA (Select)
-- Permite que todos los usuarios autenticados vean los perfiles (necesario para reportes y tablas)
CREATE POLICY "Public profiles are viewable" 
ON public.profiles FOR SELECT 
USING (true);

-- 4. Política de INSERCIÓN (Para UPSERT)
-- IMPORTANTE: Para que 'upsert' funcione, el usuario debe tener permiso de INSERT
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 5. Política de ACTUALIZACIÓN (Update)
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 6. Otorgar permisos directos al rol de Supabase
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 7. (OPCIONAL) Asegurarnos de que TU usuario sea admin en la DB
-- Reemplaza tu-correo@ejemplo.com si quieres forzarlo por correo
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('cysalguero@gmail.com', 'sergiounah@gmail.com')
);
