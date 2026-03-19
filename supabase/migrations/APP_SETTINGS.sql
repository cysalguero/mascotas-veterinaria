-- Crear tabla de configuraciones globales
create table if not exists public.app_settings (
  id uuid default uuid_generate_v4() primary key,
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Asegurarnos de que el registro de 'invoice_date_override' exista por defecto
insert into public.app_settings (key, value)
values ('invoice_date_override', '{"active": false, "allowed_date": null, "expires_at": null}')
on conflict (key) do nothing;

-- Habilitar Row Level Security (RLS)
alter table public.app_settings enable row level security;

-- Politica 1: Todos pueden LEER las configuraciones
drop policy if exists "Enable read access for all users" on public.app_settings;
create policy "Enable read access for all users" on public.app_settings for select using (true);

-- Politica 2: Solo los administradores pueden ACTUALIZAR las configuraciones
drop policy if exists "Enable update for admins" on public.app_settings;
create policy "Enable update for admins" on public.app_settings 
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
