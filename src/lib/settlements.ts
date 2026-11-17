/**
 * Utilidades y reglas de cálculo para el Cierre Mensual (Liquidaciones).
 * Garantiza que la suma en quetzales de todos los componentes coincida al centavo
 * entre Cierre Mensual, Configuración e Historial de Pagos.
 */

export const SETTLEMENT_ALLOWANCES_KEY = 'settlement_allowances'
export const ALLOWANCES_START_YEAR = 2026

export interface MonthlyAllowance {
    comida_q: number
    transporte_q: number
}

export interface SettlementAllowancesConfig {
    defaults: MonthlyAllowance
    overrides: Record<string, MonthlyAllowance>
}

export const DEFAULT_SETTLEMENT_ALLOWANCES: SettlementAllowancesConfig = {
    defaults: {
        comida_q: 750,
        transporte_q: 250,
    },
    overrides: {},
}

export interface SettlementCalculationInput {
    baseSalaryUsd: number
    daysWorked: number
    totalDaysInMonth: number
    commissionableIncomeQ: number
    exchangeRate: number
    foodAllowanceQ: number
    transportAllowanceQ: number
}

export interface SettlementCalculationResult {
    proratedSalaryUsd: number
    proratedSalaryQ: number
    commissionQ: number
    commissionUsd: number
    bonusMultipliers: number
    hasReachedGoal: boolean
    metaBonusUsd: number
    metaBonusQ: number
    foodQ: number
    transportQ: number
    totalQuetzales: number
    totalUsd: number
}

/** Redondea a 2 decimales evitando errores de punto flotante. */
export function round2(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Genera la clave 'YYYY-MM' (mes 0-indexado, igual que Date.getMonth()). */
export function getAllowanceMonthKey(year: number, monthIndex: number): string {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

/** Normaliza el JSON almacenado en app_settings bajo 'settlement_allowances'. */
export function normalizeAllowancesConfig(raw: unknown): SettlementAllowancesConfig {
    if (!raw || typeof raw !== 'object') {
        return {
            defaults: { ...DEFAULT_SETTLEMENT_ALLOWANCES.defaults },
            overrides: {},
        }
    }

    const obj = raw as Record<string, unknown>
    const rawDefaults = obj.defaults && typeof obj.defaults === 'object'
        ? (obj.defaults as Record<string, unknown>)
        : {}
    const defaults: MonthlyAllowance = {
        comida_q: Number.isFinite(Number(rawDefaults.comida_q)) ? round2(Number(rawDefaults.comida_q)) : 750,
        transporte_q: Number.isFinite(Number(rawDefaults.transporte_q)) ? round2(Number(rawDefaults.transporte_q)) : 250,
    }

    const overrides: Record<string, MonthlyAllowance> = {}
    if (obj.overrides && typeof obj.overrides === 'object') {
        for (const [key, val] of Object.entries(obj.overrides as Record<string, unknown>)) {
            if (val && typeof val === 'object') {
                const entry = val as Record<string, unknown>
                overrides[key] = {
                    comida_q: Number.isFinite(Number(entry.comida_q)) ? round2(Number(entry.comida_q)) : defaults.comida_q,
                    transporte_q: Number.isFinite(Number(entry.transporte_q)) ? round2(Number(entry.transporte_q)) : defaults.transporte_q,
                }
            }
        }
    }

    return { defaults, overrides }
}

/** Obtiene los montos de comida y transporte aplicables para un mes y año. */
export function getAllowancesForMonth(
    config: SettlementAllowancesConfig,
    year: number,
    monthIndex: number
): MonthlyAllowance {
    const key = getAllowanceMonthKey(year, monthIndex)
    if (config.overrides[key]) {
        return { ...config.overrides[key] }
    }
    if (year < ALLOWANCES_START_YEAR) {
        return { comida_q: 0, transporte_q: 0 }
    }
    return { ...config.defaults }
}

/**
 * Calcula todos los montos de liquidación garantizando que:
 * totalQuetzales === proratedSalaryQ + commissionQ + metaBonusQ + foodQ + transportQ
 */
export function calculateSettlementTotals(input: SettlementCalculationInput): SettlementCalculationResult {
    const safeTotalDays = input.totalDaysInMonth > 0 ? input.totalDaysInMonth : 30
    const safeExchangeRate = input.exchangeRate > 0 ? input.exchangeRate : 0

    const proratedSalaryUsd = round2((input.baseSalaryUsd / safeTotalDays) * input.daysWorked)
    const proratedSalaryQ = round2(proratedSalaryUsd * safeExchangeRate)

    const commissionQ = round2(input.commissionableIncomeQ * 0.05)
    const commissionUsd = safeExchangeRate > 0 ? round2(commissionQ / safeExchangeRate) : 0

    const bonusMultipliers = Math.floor(input.commissionableIncomeQ / 30000)
    const hasReachedGoal = bonusMultipliers > 0
    const metaBonusUsd = round2(bonusMultipliers * 100)
    const metaBonusQ = round2(metaBonusUsd * safeExchangeRate)

    const foodQ = round2(Math.max(0, input.foodAllowanceQ))
    const transportQ = round2(Math.max(0, input.transportAllowanceQ))

    const totalQuetzales = round2(proratedSalaryQ + commissionQ + metaBonusQ + foodQ + transportQ)
    const totalUsd = safeExchangeRate > 0 ? round2(totalQuetzales / safeExchangeRate) : 0

    return {
        proratedSalaryUsd,
        proratedSalaryQ,
        commissionQ,
        commissionUsd,
        bonusMultipliers,
        hasReachedGoal,
        metaBonusUsd,
        metaBonusQ,
        foodQ,
        transportQ,
        totalQuetzales,
        totalUsd,
    }
}
