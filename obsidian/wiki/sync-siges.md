---
archivos: [src/app/api/webhooks/siges/route.ts, src/lib/commissions.ts, src/types/invoices.ts, src/app/dashboard/pending-invoices/, test-webhook.ps1]
actualizado: 2026-11-17
---

# Sincronización SIGES

SIGES es el POS de la clínica. Cada venta (crear/modificar/anular) dispara un webhook a
`POST /api/webhooks/siges` que replica la venta en Supabase como `invoices` + `invoice_items`.

## Cómo funciona (`src/app/api/webhooks/siges/route.ts`)

1. **Firma**: verifica `x-siges-signature` (HMAC-SHA256 del body con `siges_webhook_secret`,
   que se lee de la tabla `app_settings` con fallback a env `SIGES_WEBHOOK_SECRET`).
   ⚠️ Actualmente una firma inválida solo se loguea y se IGNORA (modo desarrollo) — el
   `return 401` está comentado.
2. **Mapeo de estado** de `venta.estado` de SIGES → `status` de invoice:
   - `F` (finalizada) → `confirmed`; `A`/`X` → `cancelled`; otro → `draft`.
   - Si llega finalizada Y tiene ítems `comisionable: true` → `pending_approval`
     (requiere verificación del doctor en `/dashboard/pending-invoices`).
3. **Upsert de la factura** por `external_siges_id`:
   - Nueva: intenta emparejar `venta.vendedor.nombre` con un profile `role='doctor'` por
     matching suave de nombre. ⚠️ Si no hay match, asigna un doctor hardcodeado
     (`ac3861c5-…` — MODO PRUEBA, deuda conocida).
   - Existente: actualiza datos pero NUNCA degrada un status `confirmed`/`paid`.
4. **Sync de ítems**: borra los ítems que ya no vienen en el payload y hace upsert del resto
   por (`invoice_id`, `external_item_id`). El flag `comisionable` viene de SIGES, filtrado
   por la regla `grooming_commission_rule` (`src/lib/commissions.ts`).
5. Guarda el payload completo en `invoices.sync_raw_data` (auditoría/debug).

Usa `createClient` de `@supabase/supabase-js` con `SUPABASE_SERVICE_ROLE_KEY` (fallback anon)
para saltar RLS — es la única pieza del proyecto que lo hace.

## Campos clave (`src/types/invoices.ts`)

`Invoice`: `ticket_numero`, `fecha_venta` (YYYY-MM-DD), `forma_pago`, `total_q`, `pagado_q`,
`cambio_q`, `doctor_id`, `status`, `external_siges_id/code`, `siges_estado`, `sync_raw_data`.
`InvoiceItem`: `descripcion`, `cantidad`, `precio_unitario_q`, `total_q`, `comisionable`.

## Reglas / trampas

- La ruta es pública (excluida del auth en `src/proxy.ts`) — no romper esa exclusión.
- No degradar estados: `confirmed`/`paid` se preservan aunque SIGES reenvíe la venta.
- Probar en local con `test-webhook.ps1` (raíz del repo).
- Pendientes conocidos: activar el rechazo por firma inválida y quitar el doctor hardcodeado
  cuando termine la fase de pruebas.
