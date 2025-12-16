export type CategoryBehavior = "single" | "multi-fixed" | "multi-qty";

/**
 * Determines if a specific item should have quantity selection
 * regardless of its category behavior
 */
export function itemNeedsQuantitySelector(itemName: string): boolean {
    const upper = itemName.toUpperCase();

    // Fans and Fuel Tanks always need quantity selector
    return upper.includes('FAN') ||
        upper.includes('FUEL') ||
        upper.includes('TANK') ||
        upper.includes('VENTILADOR');
}

export function getCategoryBehavior(categoryName?: string): CategoryBehavior {
    if (!categoryName) return "multi-qty";

    const upper = categoryName.toUpperCase();

    // Core components: Single selection
    if (["ENVELOPE", "BASKET", "BURNER", "BURNER FRAME"].includes(upper)) {
        return "single";
    }

    // Qty components: Allow user to set quantity
    // "ANCILLARY" contains Inflation Fan
    if (["FUELTANK", "FUELTANK SUPPLEMENTS", "ANCILLARY", "ACCESSORIES"].includes(upper)) {
        return "multi-qty";
    }

    // Default: Multiple items allowed, but usually 1 per item (Supplements)
    return "multi-fixed";
}
