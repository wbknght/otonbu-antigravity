import { StatsPeriod } from '@/types'

export interface DateRange {
    start: string // ISO date string
    end: string   // ISO date string
}

export function getDateRange(period: StatsPeriod, customRange?: { start: string; end: string }): DateRange {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (period) {
        case 'last7days': {
            const start = new Date(today)
            start.setDate(start.getDate() - 7)
            return {
                start: start.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0],
            }
        }
        case 'thisWeek': {
            const start = new Date(today)
            const day = start.getDay()
            const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday
            start.setDate(diff)
            return {
                start: start.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0],
            }
        }
        case 'thisMonth': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1)
            return {
                start: start.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0],
            }
        }
        case 'lastMonth': {
            const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            const end = new Date(today.getFullYear(), today.getMonth(), 0)
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            }
        }
        case 'all': {
            return {
                start: '2000-01-01',
                end: '2100-12-31',
            }
        }
        case 'custom':
        default:
            if (customRange) {
                return customRange
            }
            return {
                start: '2000-01-01',
                end: '2100-12-31',
            }
    }
}
