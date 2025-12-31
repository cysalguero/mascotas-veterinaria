-- 1. Habilitar lectura pública de Categorías
alter table public.categories enable row level security;

-- Política para que cualquiera (autenticado o no) pueda LEER las categorías
-- Si ya existe, puedes ignorar el error, o borrarla primero:
drop policy if exists "Enable read access for all users" on public.categories;
create policy "Enable read access for all users" on public.categories for select using (true);

-- 2. Asegurar que la tabla items tiene la columna category_id
alter table public.invoice_items 
add column if not exists category_id uuid references public.categories(id);

-- 3. Política para que items se puedan ver (por si faltaba)
drop policy if exists "Doctors see own items" on public.invoice_items;
create policy "Doctors see own items" on public.invoice_items
  for all using (
    exists (select 1 from public.invoices where id = invoice_items.invoice_id and doctor_id = auth.uid())
  );
