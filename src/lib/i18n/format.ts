/**
 * Currency and date formatters.
 * Reads locale/currency from business_settings defaults or
 * falls back to tr-TR / TRY.
 */

const DEFAULT_LOCALE = 'tr-TR'
const DEFAULT_CURRENCY = 'TRY'

/** Format kuruş amount to display string. e.g. 15000 → "₺150,00" */
export function formatMoney(
    amountKrs: number,
    currency: string = DEFAULT_CURRENCY,
    locale: string = DEFAULT_LOCALE
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amountKrs / 100)
}

/** Format kuruş to plain number. e.g. 15000 → "150,00" */
export function formatAmount(
    amountKrs: number,
    locale: string = DEFAULT_LOCALE
): string {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amountKrs / 100)
}

/** Parse display amount back to kuruş. e.g. "150" → 15000, "150.50" → 15050 */
export function parseToKurus(displayAmount: string): number {
    const cleaned = displayAmount.replace(/[^\d.,]/g, '').replace(',', '.')
    return Math.round(parseFloat(cleaned) * 100)
}

/** Format date in Turkish locale */
export function formatDate(
    date: string | Date,
    locale: string = DEFAULT_LOCALE
): string {
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(date))
}

/** Format date+time in Turkish locale */
export function formatDateTime(
    date: string | Date,
    locale: string = DEFAULT_LOCALE
): string {
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date))
}
