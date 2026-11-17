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

export interface SettlementPrintPayload {
    clinicName?: string
    doctorName: string
    monthName: string
    year: number
    statusLabel: string
    paymentMethod: string
    daysWorked: number
    totalDaysInMonth: number
    baseSalaryUsd: number
    exchangeRate: number
    commissionableIncomeQ: number
    calc: SettlementCalculationResult
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function fmtMoney(value: number): string {
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

/** Genera el HTML imprimible (A4/Carta) para guardar el cierre mensual en PDF. */
export function buildSettlementPrintHtml(payload: SettlementPrintPayload): string {
    const clinicName = escapeHtml(payload.clinicName || 'Mascotas Clínica Veterinaria')
    const doctorName = escapeHtml(payload.doctorName)
    const periodLabel = escapeHtml(`${payload.monthName} ${payload.year}`)
    const statusLabel = escapeHtml(payload.statusLabel)
    const paymentMethod = escapeHtml(payload.paymentMethod || 'Efectivo')
    const emittedAt = escapeHtml(new Date().toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }))

    const { calc } = payload

    const bonusRow = calc.hasReachedGoal
        ? `
        <tr>
            <td>
                <div class="item-title">Bono por Meta Alcanzada</div>
                <div class="item-sub">${calc.bonusMultipliers}x Meta de Q 30,000.00 superada ($ ${fmtMoney(calc.metaBonusUsd)})</div>
            </td>
            <td class="num">$ ${fmtMoney(calc.metaBonusUsd)}</td>
            <td class="num strong">Q ${fmtMoney(calc.metaBonusQ)}</td>
        </tr>`
        : ''

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <title>Cierre_Mensual_${escapeHtml(payload.monthName)}_${payload.year}</title>
    <style>
        @page { size: letter; margin: 16mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #18181b;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .sheet { max-width: 720px; margin: 0 auto; }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #18181b;
            padding-bottom: 16px;
            margin-bottom: 20px;
        }
        .brand { font-size: 20px; font-weight: 900; letter-spacing: -0.02em; }
        .subtitle { font-size: 12px; color: #52525b; margin-top: 4px; font-weight: 600; }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            background: #f4f4f5;
            color: #18181b;
            border: 1px solid #d4d4d8;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px 20px;
            background: #fafafa;
            border: 1px solid #e4e4e7;
            border-radius: 12px;
            padding: 14px 18px;
            margin-bottom: 22px;
            font-size: 12px;
        }
        .meta-label { color: #71717a; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; }
        .meta-val { font-weight: 800; color: #18181b; margin-top: 2px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
        th {
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #71717a;
            border-bottom: 1px solid #d4d4d8;
            padding: 10px 8px;
        }
        th.num, td.num { text-align: right; }
        td { padding: 12px 8px; border-bottom: 1px solid #f4f4f5; vertical-align: middle; font-size: 13px; }
        .item-title { font-weight: 800; color: #18181b; }
        .item-sub { font-size: 11px; color: #71717a; margin-top: 2px; }
        .strong { font-weight: 800; }
        .total-box {
            background: #18181b;
            color: #ffffff;
            border-radius: 14px;
            padding: 18px 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 36px;
        }
        .total-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #a1a1aa; font-weight: 800; }
        .total-ref { font-size: 12px; color: #93c5fd; font-weight: 700; margin-top: 4px; }
        .total-q { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; }
        .signatures {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 48px;
            margin-top: 48px;
        }
        .sig-line {
            border-top: 1px solid #71717a;
            padding-top: 8px;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            color: #52525b;
        }
        .footer {
            margin-top: 28px;
            font-size: 10px;
            color: #a1a1aa;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="header">
            <div>
                <div class="brand">${clinicName}</div>
                <div class="subtitle">Comprobante de Cierre Mensual • ${periodLabel}</div>
            </div>
            <div class="badge">${statusLabel}</div>
        </div>

        <div class="meta-grid">
            <div>
                <div class="meta-label">Profesional</div>
                <div class="meta-val">${doctorName}</div>
            </div>
            <div>
                <div class="meta-label">Periodo Liquidado</div>
                <div class="meta-val">${periodLabel}</div>
            </div>
            <div>
                <div class="meta-label">Días Trabajados</div>
                <div class="meta-val">${payload.daysWorked} de ${payload.totalDaysInMonth} días</div>
            </div>
            <div>
                <div class="meta-label">Tipo de Cambio</div>
                <div class="meta-val">Q ${fmtMoney(payload.exchangeRate)} / $1.00</div>
            </div>
            <div>
                <div class="meta-label">Ventas Comisionables</div>
                <div class="meta-val">Q ${fmtMoney(payload.commissionableIncomeQ)}</div>
            </div>
            <div>
                <div class="meta-label">Método de Pago</div>
                <div class="meta-val">${paymentMethod}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th class="num">Referencia USD</th>
                    <th class="num">Monto en Quetzales</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="item-title">Sueldo Base</div>
                        <div class="item-sub">Base $ ${fmtMoney(payload.baseSalaryUsd)} (${payload.daysWorked}/${payload.totalDaysInMonth} días)</div>
                    </td>
                    <td class="num">$ ${fmtMoney(calc.proratedSalaryUsd)}</td>
                    <td class="num strong">Q ${fmtMoney(calc.proratedSalaryQ)}</td>
                </tr>
                <tr>
                    <td>
                        <div class="item-title">Comisiones (5%)</div>
                        <div class="item-sub">Sobre Q ${fmtMoney(payload.commissionableIncomeQ)} en ventas comisionables</div>
                    </td>
                    <td class="num">$ ${fmtMoney(calc.commissionUsd)}</td>
                    <td class="num strong">Q ${fmtMoney(calc.commissionQ)}</td>
                </tr>
                ${bonusRow}
                <tr>
                    <td>
                        <div class="item-title">Comida del Mes Siguiente</div>
                        <div class="item-sub">Monto completo en quetzales</div>
                    </td>
                    <td class="num">—</td>
                    <td class="num strong">Q ${fmtMoney(calc.foodQ)}</td>
                </tr>
                <tr>
                    <td>
                        <div class="item-title">Auxilio de Transporte</div>
                        <div class="item-sub">Mes siguiente • Monto completo en quetzales</div>
                    </td>
                    <td class="num">—</td>
                    <td class="num strong">Q ${fmtMoney(calc.transportQ)}</td>
                </tr>
            </tbody>
        </table>

        <div class="total-box">
            <div>
                <div class="total-label">Total Neto a Liquidar</div>
                <div class="total-ref">Referencia: $ ${fmtMoney(calc.totalUsd)} (T.C. Q ${fmtMoney(payload.exchangeRate)})</div>
            </div>
            <div class="total-q">Q ${fmtMoney(calc.totalQuetzales)}</div>
        </div>

        <div class="signatures">
            <div class="sig-line">Administración • ${clinicName}</div>
            <div class="sig-line">Recibí Conforme • ${doctorName}</div>
        </div>

        <div class="footer">Emitido el ${emittedAt}</div>
    </div>
</body>
</html>`
}

/** Abre el diálogo nativo de impresión / Guardar como PDF sin salir de la pantalla. */
export function printSettlementSummary(payload: SettlementPrintPayload): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const html = buildSettlementPrintHtml(payload)
    const previousTitle = document.title
    const cleanMonth = payload.monthName.replace(/\s+/g, '_')
    document.title = `Cierre_Mensual_${cleanMonth}_${payload.year}`

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    const cleanup = () => {
        document.title = previousTitle
        if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
        }
    }

    const frameWindow = iframe.contentWindow
    const frameDoc = frameWindow?.document
    if (!frameWindow || !frameDoc) {
        cleanup()
        return
    }

    frameDoc.open()
    frameDoc.write(html)
    frameDoc.close()

    let printed = false
    const triggerPrint = () => {
        if (printed) return
        printed = true
        frameWindow.focus()
        frameWindow.addEventListener('afterprint', cleanup, { once: true })
        frameWindow.print()
        window.setTimeout(cleanup, 60000)
    }

    if (frameDoc.readyState === 'complete') {
        window.setTimeout(triggerPrint, 100)
    } else {
        iframe.onload = () => window.setTimeout(triggerPrint, 100)
    }
}
