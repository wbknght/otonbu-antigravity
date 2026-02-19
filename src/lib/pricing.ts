/**
 * Price Resolver — resolves the suggested price for a package × vehicle_class combo.
 *
 * Uses the active price_list with matching price_rules.
 * Returns { amount_krs, currency, breakdown, warnings }.
 */

'use server'

import { createClient } from '@/utils/supabase/server'

export interface PriceBreakdown {
    package_id: string
    package_name: string
    vehicle_class_id: string
    vehicle_class_label: string
    amount_krs: number
    currency: string
}

export interface PriceResult {
    found: boolean
    amount_krs: number
    currency: string
    breakdown: PriceBreakdown[]
    warnings: string[]
}

/**
 * Resolve price for a given package + vehicle class.
 * Looks for the active price_list and finds matching rules.
 */
export async function resolvePrice(
    packageId: string,
    vehicleClassId: string
): Promise<PriceResult> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // Find active price list (most specific: valid date range first, then any active)
    const { data: priceLists } = await supabase
        .from('price_lists')
        .select('id, name')
        .eq('is_active', true)
        .or(`valid_from.is.null,valid_from.lte.${today}`)
        .or(`valid_to.is.null,valid_to.gte.${today}`)
        .order('valid_from', { ascending: false, nullsFirst: false })

    if (!priceLists || priceLists.length === 0) {
        return {
            found: false,
            amount_krs: 0,
            currency: 'TRY',
            breakdown: [],
            warnings: ['Aktif fiyat listesi bulunamadı'],
        }
    }

    // Search through price lists for a matching rule
    for (const pl of priceLists) {
        const { data: rule } = await supabase
            .from('price_rules')
            .select(`
                *,
                packages ( name ),
                vehicle_classes ( label )
            `)
            .eq('price_list_id', pl.id)
            .eq('package_id', packageId)
            .eq('vehicle_class_id', vehicleClassId)
            .single()

        if (rule) {
            return {
                found: true,
                amount_krs: Number(rule.amount_krs),
                currency: rule.currency,
                breakdown: [{
                    package_id: packageId,
                    package_name: (rule as any).packages?.name || '',
                    vehicle_class_id: vehicleClassId,
                    vehicle_class_label: (rule as any).vehicle_classes?.label || '',
                    amount_krs: Number(rule.amount_krs),
                    currency: rule.currency,
                }],
                warnings: [],
            }
        }
    }

    // No matching rule found
    return {
        found: false,
        amount_krs: 0,
        currency: 'TRY',
        breakdown: [],
        warnings: [`Bu paket ve araç sınıfı için fiyat kuralı bulunamadı`],
    }
}
