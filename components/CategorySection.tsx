"use client";

import { CatalogCategory, CatalogItem, SelectedItem } from "@/types";
import { getCategoryBehavior } from "@/lib/category-logic";
import { getCompatibleBaskets, getCompatibleBurners } from "@/lib/compatibility";

interface CategorySectionProps {
    category: CatalogCategory;
    selectedItems: Map<string, SelectedItem>;
    selectedEnvelope: string | null;
    vendorId: string;
    onSelect: (item: CatalogItem, qty: number, customPrice?: number) => void;
    onRemove: (itemId: string) => void;
}

export function CategorySection({ category, selectedItems, selectedEnvelope, vendorId, onSelect, onRemove }: CategorySectionProps) {
    const behavior = getCategoryBehavior(category.name);

    // Filter items based on compatibility
    const filteredItems = (() => {
        const categoryUpper = category.name.toUpperCase();

        // Only filter BASKET and BURNER categories if an envelope is selected
        if (!selectedEnvelope) return category.items;

        if (categoryUpper === "BASKET") {
            const compatibleBaskets = getCompatibleBaskets(vendorId, selectedEnvelope);
            return category.items.filter(item => compatibleBaskets.includes(item.name));
        }

        if (categoryUpper === "BURNER") {
            const compatibleBurners = getCompatibleBurners(vendorId, selectedEnvelope);
            return category.items.filter(item => compatibleBurners.includes(item.name));
        }

        return category.items;
    })();

    // Helper to check if item is selected
    const getSelection = (id: string) => selectedItems.get(id);

    // Single Selection Logic (Radio-like)
    const isSelected = (id: string) => selectedItems.has(id);

    const handleSingleSelect = (item: CatalogItem) => {
        if (isSelected(item.id)) {
            onRemove(item.id);
        } else {
            // Inject category name
            onSelect({ ...item, category: category.name }, 1);
        }
    };

    // Render logic variations
    if (behavior === "single") {
        // Find selected item ID
        const selectedId = Array.from(selectedItems.keys()).find(id => filteredItems.some(i => i.id === id)) || "";

        return (
            <div className="mb-6 border rounded-lg p-5 shadow-sm bg-white">
                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide mb-3">{category.name}</h2>

                <select
                    value={selectedId}
                    onChange={(e) => {
                        const item = category.items.find(i => i.id === e.target.value);
                        if (item) handleSingleSelect(item);
                    }}
                    className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
                >
                    <option value="" disabled>-- Select {category.name} --</option>
                    {filteredItems.map(item => (
                        <option key={item.id} value={item.id}>
                            {item.name} — €{item.price.toLocaleString("en-IE")}
                        </option>
                    ))}
                </select>

                {/* Show description of selected item below */}
                {selectedId && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-md border border-slate-100 text-sm text-slate-600 animate-in fade-in">
                        <p className="whitespace-pre-line">
                            {category.items.find(i => i.id === selectedId)?.description || "No description available."}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // Multi / Qty Logic (Default)
    return (
        <div className="mb-8 border rounded-lg p-6 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">
                    {category.name}
                </h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {behavior === "multi-qty" ? "Quantity Select" : "Multiple Items"}
                </span>
            </div>

            <div className="space-y-3">
                {category.items.map((item) => {
                    const selection = getSelection(item.id);
                    const checked = !!selection;

                    const isArtwork = item.name.toLowerCase().includes("artwork");

                    return (
                        <div
                            key={item.id}
                            className={`flex flex-col p-3 rounded-md transition-colors border ${checked ? "bg-blue-50 border-blue-200" : "hover:bg-slate-50 border-transparent"
                                }`}
                        >
                            <div className="flex items-start cursor-pointer" onClick={() => (checked ? onRemove(item.id) : onSelect({ ...item, category: category.name }, 1))}>
                                <div className="pt-1 mr-3">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => { }}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-slate-900">{item.name}</h3>
                                        {!isArtwork && (
                                            <span className="font-mono text-slate-700 whitespace-nowrap ml-4">
                                                € {item.price.toLocaleString("en-IE", { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className="text-sm text-slate-500 mt-1 whitespace-pre-line">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Extended Inputs for Selected Items */}
                            {checked && (
                                <div className="mt-3 ml-8 flex gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-200">

                                    {/* Quantity Input */}
                                    {behavior === "multi-qty" && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs uppercase font-bold text-slate-500">Qty:</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={selection?.quantity?.toString() || ""}
                                                onChange={(e) => {
                                                    // Allow empty string to let user clear the input
                                                    const val = e.target.value;
                                                    if (val === "") {
                                                        // Temporarily set to 0 or handled by UI state if we could, 
                                                        // but here we just update with 0 or 1.
                                                        // A better UX is often to keep the number but let them type.
                                                        // Let's try parsing.
                                                        onSelect({ ...item, category: category.name }, 0, selection?.customPrice);
                                                    } else {
                                                        const parsed = parseInt(val);
                                                        if (!isNaN(parsed)) {
                                                            onSelect({ ...item, category: category.name }, parsed, selection?.customPrice);
                                                        }
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    // On blur, ensure at least 1
                                                    if (!selection?.quantity || selection.quantity < 1) {
                                                        onSelect({ ...item, category: category.name }, 1, selection?.customPrice);
                                                    }
                                                }}
                                                className="w-16 p-1 text-sm border rounded"
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
                                                // If value is 0 or matches default price, maybe show empty? 
                                                // Or just show value. The issue was leading with "0".
                                                // We rely on standard number input behavior but value={undefined} if we want placeholder.
                                                // Better: utilize a local state or simplified handler.
                                                // For now, let's just pass the raw value but handle the change better.
                                                value={selection?.customPrice !== undefined ? selection.customPrice : ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === "") {
                                                        // Allow clearing
                                                        onSelect({ ...item, category: category.name }, selection?.quantity || 1, 0);
                                                    } else {
                                                        const parsed = parseFloat(val);
                                                        if (!isNaN(parsed)) {
                                                            onSelect({ ...item, category: category.name }, selection?.quantity || 1, parsed);
                                                        }
                                                    }
                                                }}
                                                className="w-28 p-1 text-sm border rounded font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
