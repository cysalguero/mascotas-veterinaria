/**
 * Reglas de elegibilidad de comisiones por ítem.
 * Centraliza el bloqueo configurable de Grooming para mantener consistencia entre
 * Nueva Venta, Webhook SIGES, Búsqueda de Ítems, Historial, Métricas y Cierre Mensual.
 */

export const GROOMING_RULE_KEY = 'grooming_commission_rule'

export interface GroomingCommissionRule {
    block_grooming: boolean
}

export const DEFAULT_GROOMING_RULE: GroomingCommissionRule = {
    block_grooming: true,
}

/** Normaliza el JSON almacenado en app_settings bajo 'grooming_commission_rule'. */
export function normalizeGroomingRule(raw: unknown): GroomingCommissionRule {
    if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_GROOMING_RULE }
    }
    const obj = raw as Record<string, unknown>
    if (typeof obj.block_grooming === 'boolean') {
        return { block_grooming: obj.block_grooming }
    }
    return { ...DEFAULT_GROOMING_RULE }
}

/**
 * Determina si un ítem pertenece a Grooming:
 * - Si su categoría contiene "grooming" -> true (ej. GROOMING UNIDAD, CORTE DE UÑAS UNIDAD).
 * - Si su categoría es explícitamente "Venta de producto" -> false (ej. gabacha física).
 * - En cualquier otro caso (incluyendo ítems sin categoría desde webhook) -> true si la descripción contiene "grooming".
 */
export function isGroomingItem(item: {
    descripcion?: string | null
    categoryName?: string | null
}): boolean {
    const category = (item.categoryName || '').trim().toLowerCase()
    if (category.includes('grooming')) {
        return true
    }
    if (category.includes('venta de producto')) {
        return false
    }
    const description = (item.descripcion || '').trim().toLowerCase()
    return description.includes('grooming')
}

/** Calcula si un ítem es comisionable aplicando la regla activa de Grooming. */
export function isItemCommissionableEffective(
    item: {
        comisionable?: boolean | null
        descripcion?: string | null
        categoryName?: string | null
    },
    blockGrooming: boolean
): boolean {
    if (!item.comisionable) return false
    if (blockGrooming && isGroomingItem(item)) return false
    return true
}
