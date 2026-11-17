# Tareas — backlog vivo

> Las IAs consultan esto al iniciar sesión y anotan aquí las tareas no triviales
> ("en curso (nombre de la IA)") para no pisarse entre ellas.
> Estados fijos: pendiente · en curso (IA) · bloqueada (motivo) · hecha (fecha, IA) ·
> fallida (enlace al post-mortem). Una tarea fallida nunca se borra en silencio.

## Pendiente

- [ ] Entrevista de visión para llenar `obsidian/vision.md` (dueño + IA — único paso del bootstrap pendiente)
- [ ] Activar `SUPABASE_ACCESS_TOKEN` como variable de entorno de usuario (el dueño; ver log 2026-07-13)
- [ ] Activar el rechazo por firma inválida en el webhook SIGES (hoy solo loguea — modo desarrollo)
- [ ] Quitar el doctor UUID hardcodeado del webhook cuando termine la fase de pruebas
- [ ] Mover el token de Vetesoft de `src/actions/vetesoft.ts` a `.env.local`

## En curso

(nada)

## Bloqueadas

(nada)

## Hecho

- [x] 2026-11-17 — Agregar regla configurable (Sí/No) para excluir Grooming de comisiones y corregir ítems históricos de categoría Grooming (Gemini)
- [x] 2026-11-17 — Implementar impresión / exportación a PDF del resumen de Cierre Mensual e Historial (Gemini)
- [x] 2026-11-17 — Agregar comida del mes siguiente (Q750) y auxilio de transporte (Q250) a Cierre Mensual, Historial de Pagos y pestaña en Configuración, desde enero 2026 (Gemini)
- [x] 2026-11-14 — Migrar webhook n8n (`recibo-preview`) a `mascotas-n8n.c65geq.easypanel.host` por expiración de `cysolutions.cloud` (Gemini)
- [x] 2026-07-13 — Bootstrap del vault LLM Wiki Brújula (Claude)

## Fallidas

(nada — si una tarea falla, anotarla aquí con enlace a su post-mortem en `wiki/errores/`)
