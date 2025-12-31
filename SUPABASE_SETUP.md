# 🛠️ Solución al error de Lectura en Supabase (Categorías)

El problema es de **Permisos**. Por defecto, Supabase crea las tablas "Privadas" (RLS Enabled), lo que significa que nadie (ni tu propia App) puede leerlas hasta que agregues una "Política de Acceso".

## Pasos para Resolverlo (1 minuto)

1. Ve a tu proyecto en **[Supabase Dashboard](https://supabase.com/dashboard/project/_/editor/sql)**.
2. En la barra lateral izquierda, busca el ícono **SQL Editor** (parece una hoja de papel con `>_`).
3. Haz clic en **"New Query"** (o Nueva Consulta).
4. **Copia y Pega** el siguiente código exactamente como está:

```sql
-- 1. Permitir que la App lea las categorías
alter table public.categories enable row level security;
drop policy if exists "Enable read access for all users" on public.categories;
create policy "Enable read access for all users" on public.categories for select using (true);

-- 2. Asegurar columna category_id en items (por si falta)
alter table public.invoice_items 
add column if not exists category_id uuid references public.categories(id);

-- 3. Insertar categorías base (si la tabla está vacía)
insert into public.categories (name)
select name from (values 
  ('Consulta'), 
  ('Vacunación'), 
  ('Cirugía'), 
  ('Farmacia'), 
  ('Alimento'), 
  ('Estética'),
  ('Insumos')
) as v(name)
where not exists (select 1 from public.categories where name = v.name);
```

5. Haz clic en el botón verde **RUN** (Ejecutar) en la esquina inferior derecha.
6. Deberías ver un mensaje que dice "Success" o "No rows returned".

## ¿Cómo verificar?
Una vez hecho esto, **Vuelve a tu App Local (localhost:3000)** y recarga la página. 
El menú de categorías debería cargar las opciones reales de tu base de datos (Consulta, Vacunación, etc.) sin usar los datos de respaldo.
