---
archivos: [supabase/migrations/, src/types/invoices.ts, src/types/supabase.ts]
actualizado: 2026-11-17
---

# Base de datos (Supabase)

Postgres en Supabase con RLS. El esquema NO se gestiona con migraciones ordenadas del CLI:
son archivos SQL sueltos en `supabase/migrations/` que se ejecutan a mano en el SQL Editor.

## Tablas principales (según código y SQL)

| Tabla | Qué guarda |
| --- | --- |
| `invoices` | Facturas/ventas (espejo de SIGES + cache `patient_*` + `doctor_id`, `status`) |
| `invoice_items` | Ítems por factura (`comisionable`, `external_item_id`, montos `_q`) |
| `invoice_patients` | Relación factura↔pacientes Vetesoft (fuente relacional de verdad) |
| `profiles` | Usuarios con `role` (p. ej. `doctor`), `full_name` |
| `app_settings` | Config clave/valor (`siges_*`, `invoice_date_override`, `settlement_allowances`) |
| `settlements` | Liquidaciones del cierre mensual (incluye `comida_mes_siguiente_q`, `auxilio_transporte_q`) |

## Archivos SQL clave

- `schema.sql` — base. `UPDATE_SETTLEMENT_SCHEMA.sql`, `ADD_ACCOUNTING_DATE.sql`,
  `ADD_GOAL_COLUMNS.sql`, `APP_SETTINGS.sql`, `ADD_ALLOWANCES_TO_SETTLEMENTS.sql` — evolución del esquema.
- Los `FIX_*` (INVOICES_RLS, PROFILES_RLS, PERMISSIONS, SETTLEMENTS_*) documentan la historia
  de arreglos de RLS/permisos — leerlos antes de tocar políticas.

## Reglas / trampas

- Todo cambio de esquema o RLS deja su `.sql` aquí; sin archivo, el cambio es invisible y
  otro entorno no lo puede reproducir.
- `src/types/supabase.ts` está casi vacío — los tipos reales de dominio están en
  `src/types/invoices.ts` (mantenerlos sincronizados con el esquema).
- Columnas monetarias siempre con sufijo `_q` (quetzales).
