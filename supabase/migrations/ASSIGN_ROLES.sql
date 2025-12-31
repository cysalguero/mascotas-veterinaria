-- ==========================================================
-- SCRIPT DE CONFIGURACIÓN DE PERFILES Y ROLES
-- ==========================================================

-- 1. Crear la tabla de perfiles si no existe
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'doctor',
    full_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Seguridad de Nivel de Fila (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas de acceso
-- Los usuarios pueden leer su propio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Solo administradores pueden ver todos los perfiles (opcional)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 4. Funión y Trigger para sincronizar automáticamente Auth con Profiles
-- Esto crea un perfil cada vez que registras a alguien en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si ya existe para evitar errores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. INSERTAR PERFILES PARA USUARIOS YA EXISTENTES
-- (En caso de que ya los hubieras creado y el trigger no corriera para ellos)
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. ASIGNAR LOS ROLES ESPECÍFICOS QUE SOLICITASTE
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN ('cysalguero@gmail.com', 'sergiounah@gmail.com');

UPDATE public.profiles 
SET role = 'doctor' 
WHERE email = 'nru.nataliauseche16@gmail.com';

-- 7. RESTRICCIÓN DE VALORES PARA EL ROL
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin', 'doctor'));
    END IF;
END $$;
