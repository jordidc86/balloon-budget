import { useState } from "react";
import { CatalogCategory, CatalogItem, SelectedItem } from "@/types";
import { getCategoryBehavior } from "@/lib/category-logic";
import { getCompatibleBaskets, getCompatibleBurners } from "@/lib/compatibility";

interface CategorySectionProps {
    category: CatalogCategory;
    selectedItems: Map<string, SelectedItem>;
    selectedEnvelope: string | null;
    selectedBurner?: string | null;
    vendorId: string;
    onSelect: (item: CatalogItem, qty: number, customPrice?: number, customDescription?: string) => void;
    onRemove: (itemId: string) => void;
}

export function CategorySection({ category, selectedItems, selectedEnvelope, selectedBurner, vendorId, onSelect, onRemove }: CategorySectionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const behavior = getCategoryBehavior(category.name);

    // Filter items based on compatibility
    const filteredItems = (() => {
        const categoryUpper = category.name.toUpperCase();

        // Only filter BASKET and BURNER categories if an envelope is selected
        if (!selectedEnvelope && categoryUpper !== "BURNER FRAME") return category.items;

        if (categoryUpper === "BASKET") {
            // If no envelope selected, show all (handled early return), else filter
            if (!selectedEnvelope) return category.items;
            const compatibleBaskets = getCompatibleBaskets(vendorId, selectedEnvelope!);
            return category.items.filter(item => compatibleBaskets.includes(item.name));
        }

        if (categoryUpper === "BURNER") {
            if (!selectedEnvelope) return category.items;
            const compatibleBurners = getCompatibleBurners(vendorId, selectedEnvelope!);
            return category.items.filter(item => compatibleBurners.includes(item.name));
        }

        // Burner Frame Filtering Logic
        if (categoryUpper === "BURNER FRAME" && selectedBurner) {
            const burnerUpper = selectedBurner.toUpperCase();

            // Determine burner type
            let requiredType = "";
            if (burnerUpper.includes("DOUBLE")) requiredType = "DOUBLE";
            else if (burnerUpper.includes("TRIPLE")) requiredType = "TRIPLE";
            else if (burnerUpper.includes("QUAD")) requiredType = "QUADRUPLE";
            else if (burnerUpper.includes("QUADRUPLE")) requiredType = "QUADRUPLE";

            if (requiredType) {
                return category.items.filter(item => item.name.toUpperCase().includes(requiredType));
            }
        }

        return category.items;
    })();

    // Helper to check if item is selected
    const getSelection = (id: string) => selectedItems.get(id);

    // Single Selection Logic (Radio-like)
    const isSelected = (id: string) => selectedItems.has(id);

    // Find currently selected item for this category (for single select dropdown)
    const currentSelectedItem = behavior === "single"
        ? filteredItems.find(item => isSelected(item.id))
        : null;

    const handleSingleSelect = (item: CatalogItem) => {
        if (isSelected(item.id)) {
            // Already selected, do nothing or allow toggle? 
            // For dropdown, usually clicking same option doesn't unselect, but standard behavior is select new.
            // If we want to clear selection, we might need a clear button.
        } else {
            // Remove any other item from this category first?
            // unique-category logic handles this in BudgetBuilder usually?
            // Actually CategorySection calls onSelect. BudgetBuilder doesn't auto-clear others if we don't tell it to?
            // Let's assume onSelect appends. So we must manually clear others if proper single select behavior isn't enforced upstream.
            // Actually, let's keep it simple: unique logic should be in standard behavior.
            // The existing `handleSingleSelect` did: `if (isSelected) onRemove else onSelect`.
            // But for dropdown, we just want to select.

            // Fix: Clean up other items in this category if single mode
            filteredItems.forEach(i => {
                if (isSelected(i.id)) onRemove(i.id);
            });
            onSelect({ ...item, category: category.name }, 1);
        }
        setIsOpen(false); // Close dropdown after selection
    };

    return (
        <section className="mb-6 border border-slate-200 rounded-lg bg-white shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-lg">
                <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">{category.name}</h3>
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                    {filteredItems.length} options
                </span>
            </div>

            <div className="p-4">
                {behavior === "single" ? (
                    // DROPDOWN UI for Single Select
                    <div className="relative">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-full text-left p-3 border rounded-lg flex justify-between items-center bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                            <span className={`font-medium ${currentSelectedItem ? 'text-slate-800' : 'text-slate-400'}`}>
                                {currentSelectedItem ? currentSelectedItem.name : `Select ${category.name}...`}
                            </span>
                            <svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {filteredItems.length === 0 ? (
                                    <div className="p-3 text-slate-400 text-sm italic">No compatible items found.</div>
                                ) : (
                                    filteredItems.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleSingleSelect(item)}
                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between group"
                                        >
                                            <span className="text-slate-700 group-hover:text-blue-700 font-medium">{item.name}</span>
                                            <span className="text-slate-400 text-sm">{item.price === 0 ? "Complimentary" : `€${item.price.toLocaleString()}`}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Details Panel for Selected Item (Single Mode) */}
                        {currentSelectedItem && (
                            <div className="mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-blue-900">{currentSelectedItem.name}</h4>
                                        <p className="text-sm text-blue-700/80 mt-1 whitespace-pre-wrap">{currentSelectedItem.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-blue-800">
                                            {currentSelectedItem.price === 0 ? "FREE" : `€${currentSelectedItem.price.toLocaleString()}`}
                                        </div>
                                        <button
                                            onClick={() => onRemove(currentSelectedItem.id)}
                                            className="text-xs text-red-500 hover:text-red-700 mt-2 underline"
                                        >
                                            Remove Selection
                                        </button>
                                    </div>
                                </div>

                                {/* Custom Description Input if needed (e.g. Artwork in single category?) */}
                                {/* Usually Supplements are Multi, but let's be safe */}
                                {(currentSelectedItem.name.toUpperCase().includes("ARTWORK") || currentSelectedItem.name.toUpperCase().includes("HYPERLAST CONFIGURATION")) && (
                                    <div className="mt-3">
                                        <label className="text-xs uppercase font-bold text-slate-500 block mb-1">Description / Note:</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 text-sm border rounded bg-white"
                                            placeholder="Enter custom description..."
                                            value={getSelection(currentSelectedItem.id)?.customDescription || ""}
                                            onChange={(e) => onSelect({ ...currentSelectedItem, category: category.name }, 1, undefined, e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    // LIST UI for Multi-Select (Supplements, etc.)
                    <div className="space-y-2">
                        {filteredItems.map(item => {
                            const checked = isSelected(item.id);
                            const selection = getSelection(item.id);
                            const isArtworkOrHyperlast = item.name.toUpperCase().includes("ARTWORK") || item.name.toUpperCase().includes("HYPERLAST CONFIGURATION");
                            const isArtwork = item.name.toUpperCase().includes("ARTWORK");

                            return (
                                <div key={item.id} className={`p-3 rounded-lg border transition-all ${checked ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="pt-1">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        onSelect({ ...item, category: category.name }, 1);
                                                    } else {
                                                        onRemove(item.id);
                                                    }
                                                }}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <span className={`font-medium ${checked ? 'text-blue-900' : 'text-slate-700'}`}>{item.name}</span>
                                                <span className="font-mono text-slate-500">
                                                    {item.price === 0 && !isArtwork ? "Complimentary" : `€${item.price.toLocaleString()}`}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap">{selection?.customDescription || item.description}</p>
                                        </div>
                                    </div>

                                    {/* Extended Inputs for Multi-Select Items */}
                                    {checked && (
                                        <div className="mt-3 ml-8 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="flex flex-wrap gap-4 items-center">
                                                {/* Quantity Input */}
                                                {behavior === "multi-qty" && (
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs uppercase font-bold text-slate-500">Qty:</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={selection?.quantity?.toString() || ""}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === "") {
                                                                    onSelect({ ...item, category: category.name }, 0, selection?.customPrice, selection?.customDescription);
                                                                } else {
                                                                    const parsed = parseInt(val);
                                                                    if (!isNaN(parsed)) {
                                                                        onSelect({ ...item, category: category.name }, parsed, selection?.customPrice, selection?.customDescription);
                                                                    }
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                if (!selection?.quantity || selection.quantity < 1) {
                                                                    onSelect({ ...item, category: category.name }, 1, selection?.customPrice, selection?.customDescription);
                                                                }
                                                            }}
                                                            className="w-16 p-1 text-sm border rounded text-slate-900 font-medium"
                                                        />
                                                    </div>
                                                )}

                                                {/* Custom Price Input for Artwork */}
                                                {isArtwork && (
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs uppercase font-bold text-slate-500">Price (€):</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={selection?.customPrice !== undefined ? selection.customPrice : ""}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === "") {
                                                                    onSelect({ ...item, category: category.name }, selection?.quantity || 1, 0, selection?.customDescription);
                                                                } else {
                                                                    const parsed = parseFloat(val);
                                                                    if (!isNaN(parsed)) {
                                                                        onSelect({ ...item, category: category.name }, selection?.quantity || 1, parsed, selection?.customDescription);
                                                                    }
                                                                }
                                                            }}
                                                            className="w-28 p-1 text-sm border rounded font-mono text-slate-900 font-medium"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Custom Description Input */}
                                            {isArtworkOrHyperlast && (
                                                <div className="w-full">
                                                    <label className="text-xs uppercase font-bold text-slate-500 block mb-1">Description / Note:</label>
                                                    <input
                                                        type="text"
                                                        className="w-full p-1.5 text-sm border rounded text-slate-900"
                                                        placeholder="Enter custom description..."
                                                        value={selection?.customDescription || ""}
                                                        onChange={(e) => onSelect({ ...item, category: category.name }, selection?.quantity || 1, selection?.customPrice, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
