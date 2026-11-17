---
archivos: [src/app/dashboard/settlements/, src/app/dashboard/payments/, src/app/dashboard/pending-invoices/, src/app/dashboard/settings/page.tsx, src/lib/settlements.ts, src/lib/commissions.ts, src/components/invoices/]
actualizado: 2026-11-17
---

# Liquidaciones y comisiones

Los doctores ganan comisión por ítems `comisionable` de sus ventas. El sistema calcula y
liquida esas comisiones en el cierre mensual.

## Piezas

- **`/dashboard/pending-invoices`** ("Comisiones Automáticas"): facturas de SIGES en
  `pending_approval` que el doctor debe verificar. n8n con IA calcula
  `cantidad_comisionable` (feature "smart commissions", commit `2dbccfd`) con frontend
  retrocompatible.
- **`/dashboard/settlements`** ("Cierre Mensual"): liquidación por doctor. Soporta ventanas
  de facturación excepcionales multi-fecha (commit `a74e03b`) y fecha contable separada de
  la fecha de venta (`ADD_ACCOUNTING_DATE.sql`). Incluye cálculo en quetzales con **Comida del
  mes siguiente** (por defecto Q750) y **Auxilio de transporte** (por defecto Q250) vigentes
  desde enero 2026, sin prorrateo ni conversión a USD en sus tarjetas.
- **`/dashboard/settlements/history`** ("Historial Pagos"): liquidaciones pasadas con columnas
  separadas para `Sueldo Base (USD)`, `Comisiones (Q)`, `Meta (Bono)`, `Comida (Q)`,
  `Transporte (Q)` y `Total Final` (priorizando el monto real en `Q`).
- **`/dashboard/settings` (pestaña "Cierre Mensual")**: permite editar los montos base por
  defecto y ajustes por mes específico (`app_settings` clave `settlement_allowances`); si el
  mes ya tenía cierre en `settlements`, recalcula automáticamente su registro.
- **`src/lib/settlements.ts`**: helper único de cálculo (`calculateSettlementTotals`, `round2`),
  resolución de viáticos por mes (`getAllowancesForMonth`) y generación de comprobante PDF
  imprimible vía iframe oculto (`buildSettlementPrintHtml`, `printSettlementSummary`), usado
  tanto por **Cierre Mensual** (`Imprimir / PDF`) como por **Historial Pagos**.
- **`/dashboard/payments`**: análisis de pagos y métricas.
- **`src/lib/commissions.ts`**: regla configurable (`grooming_commission_rule` en
  `app_settings`, botón Sí/No en **Configuración → Configuración de Comisiones**) que impide
  comisionar ítems de categoría `Grooming` o servicios con descripción `grooming` (respetando
  ventas físicas bajo `Venta de producto`), aplicada en Nueva Venta, Webhook SIGES, Búsqueda
  de Ítems, Historial de Ventas, Métricas y Cierre Mensual.
- SQL relevante: `UPDATE_SETTLEMENT_SCHEMA.sql`, `FIX_SETTLEMENTS_COLUMNS.sql`,
  `FIX_SETTLEMENTS_PERMISSIONS.sql`, `CHECK_SETTLEMENTS_DB.sql`,
  `ADD_ALLOWANCES_TO_SETTLEMENTS.sql`, `ADD_GROOMING_RULE.sql`.

## Reglas / trampas

- El flag `comisionable` por ítem viene de SIGES; `cantidad_comisionable` lo calcula n8n —
  el frontend debe tolerar facturas viejas sin ese campo (retrocompatibilidad).
- El calendario está sincronizado con fechas CONTABLES, no de venta (commit `375d61c`) —
  cuidado al filtrar por fecha en reportes.
- Comida del mes siguiente y auxilio de transporte aplican completos en quetzales desde
  `anio >= 2026` (antes de 2026 por defecto son `0`) y se redondean por concepto (`round2`)
  antes de sumar `total_quetzales`, evitando diferencias de centavos entre pantalla, historial
  y BD.
