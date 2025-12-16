"use client";

import { useState, useMemo, useEffect } from "react";
import { Catalog, CatalogItem, SelectedItem } from "@/types";
import { CategorySection } from "./CategorySection";
import { LivePreview } from "./LivePreview";
import { KitLoader } from "./KitLoader";
import { getCategoryBehavior } from "@/lib/category-logic";
import { SavedQuotation, saveQuotation } from "@/lib/storage";

interface VendorInfo {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
}

interface BudgetBuilderProps {
    catalog: Catalog;
    vendorInfo: VendorInfo;
    loadedQuotation?: SavedQuotation | null;
    onQuotationLoaded?: () => void;
}

export function BudgetBuilder({ catalog, vendorInfo, loadedQuotation, onQuotationLoaded }: BudgetBuilderProps) {
    // Key: Item ID -> SelectedItem
    const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
    const [discount, setDiscount] = useState<number>(0);

    // Kit loader state
    const [showKitLoader, setShowKitLoader] = useState(false);

    // Client Details State
    const [clientDetails, setClientDetails] = useState({
        name: "",
        country: "",
        phone: "",
        email: ""
    });

    // Quotation Number Logic (Year + Correlative)
    const [quotationNumber, setQuotationNumber] = useState("");

    // Payment Terms State with default value
    const [paymentTerms, setPaymentTerms] = useState<string>(
        `• All prices are in EUR, VAT not included\n• Payment conditions: 50% deposit and 50% down payment\n• Delivery time: 12 weeks from order confirmation\n• Shipping: Ex-Works (customer arranges shipping)\n• Taxes not included`
    );

    // Load saved quotation if provided
    useEffect(() => {
        if (loadedQuotation && onQuotationLoaded) {
            // Restore client details
            setClientDetails(loadedQuotation.clientDetails);

            // Restore discount
            setDiscount(loadedQuotation.discount);

            // Restore quotation number
            setQuotationNumber(loadedQuotation.quotationNumber);

            // Restore payment terms if available (fallback to default if new field missing in old saves)
            if (loadedQuotation.paymentTerms) {
                setPaymentTerms(loadedQuotation.paymentTerms);
            }

            // Restore selected items
            const itemsMap = new Map<string, SelectedItem>();
            loadedQuotation.items.forEach(savedItem => {
                // Find the actual item in catalog
                const catalogItem = catalog.categories
                    .flatMap(cat => cat.items)
                    .find(item => item.id === savedItem.itemId);

                if (catalogItem) {
                    itemsMap.set(savedItem.itemId, {
                        item: catalogItem,
                        quantity: savedItem.quantity,
                        customPrice: savedItem.customPrice,
                        customDescription: savedItem.customDescription
                    });
                }
            });
            setSelectedItems(itemsMap);

            // Mark as loaded
            onQuotationLoaded();
        }
    }, [loadedQuotation]);

    useEffect(() => {
        // Generate initial quotation number on client load
        if (!quotationNumber) {
            const year = new Date().getFullYear();
            const randomSeq = Math.floor(100 + Math.random() * 900);
            setQuotationNumber(`${year}-${randomSeq}`);
        }
    }, []);

    // Convert Map to Array for easier rendering
    const selectedList = useMemo(() => Array.from(selectedItems.values()), [selectedItems]);

    // Calculate total with percentage discount
    const totalAmount = useMemo(() => {
        const rawTotal = selectedList.reduce((sum, { item, quantity, customPrice }) => {
            const price = customPrice !== undefined ? customPrice : item.price;
            return sum + (price * quantity);
        }, 0);

        // Discount is now a percentage
        const discountAmount = (rawTotal * discount) / 100;
        return Math.max(0, rawTotal - discountAmount);
    }, [selectedList, discount]);

    // Auto-save quotation whenever state changes
    useEffect(() => {
        if (selectedItems.size > 0 && quotationNumber) {
            const quotation: SavedQuotation = {
                id: quotationNumber,
                vendorId: vendorInfo.id,
                vendorName: vendorInfo.name,
                date: new Date().toISOString(),
                clientName: clientDetails.name,
                clientDetails,
                items: Array.from(selectedItems.values()).map(({ item, quantity, customPrice, customDescription }) => ({
                    itemId: item.id,
                    itemName: item.name,
                    category: item.category || "UNKNOWN",
                    quantity,
                    price: item.price,
                    customPrice,
                    customDescription
                })),
                discount,
                total: totalAmount,
                quotationNumber,
                paymentTerms // Save the current terms
            };
            saveQuotation(quotation);
        }
    }, [selectedItems, clientDetails, discount, quotationNumber, totalAmount, vendorInfo, paymentTerms]);


    // Derive selected Envelope and Burner for compatibility
    const selectedEnvelope = useMemo(() => {
        // Find item in ENVELOPE category
        for (const [id, selected] of selectedItems.entries()) {
            if (selected.item.category === "ENVELOPE" || selected.item.name.includes("Envelope")) { // Fallback name check if category not explicitly set in item
                // Actually we inject category on select, so check selected.item.category is safer if we persist it
                // But in handleSelect we inject it into the object we store? 
                // We store SelectedItem which has item: CatalogItem.
                // We inject category into item object in handleSelect? Yes: { ...item, category: category.name }
                return selected.item.name;
            }
        }
        return null;
    }, [selectedItems]);

    const selectedBurner = useMemo(() => {
        for (const [id, selected] of selectedItems.entries()) {
            // Check for BURNER category, but NOT "BURNER FRAME"
            if (selected.item.category === "BURNER") {
                return selected.item.name;
            }
        }
        return null;
    }, [selectedItems]);

    const handleSelect = (item: CatalogItem, qty: number, customPrice?: number, customDescription?: string) => {
        const newItems = new Map(selectedItems);
        // If qty is 0, arguably we should remove it, but maybe user wants 0? 
        // Logic in CategorySection calls onRemove if unchecked.
        // Here we just update.
        newItems.set(item.id, { item, quantity: qty, customPrice, customDescription });
        setSelectedItems(newItems);
    };

    const handleRemove = (itemId: string) => {
        const newItems = new Map(selectedItems);
        newItems.delete(itemId);
        setSelectedItems(newItems);
    };

    const handleAddCustomItem = (name: string, description: string, price: number) => {
        const newItem: CatalogItem = {
            id: `custom_${Date.now()}`,
            name,
            description,
            price,
            category: "CUSTOM"
        };
        handleSelect(newItem, 1);
    };

    // Load kit handler
    const handleLoadKit = (envelope: string, basket: string, burner: string) => {
        // Find items in catalog
        const envelopeItem = catalog.categories
            .find(cat => cat.name.toUpperCase() === "ENVELOPE")
            ?.items.find(item => item.name === envelope);

        const basketItem = catalog.categories
            .find(cat => cat.name.toUpperCase() === "BASKET")
            ?.items.find(item => item.name === basket);

        const burnerItem = catalog.categories
            .find(cat => cat.name.toUpperCase() === "BURNER")
            ?.items.find(item => item.name === burner);

        // Clear current selection and add kit items
        setSelectedItems(new Map());

        if (envelopeItem) handleSelect({ ...envelopeItem, category: "ENVELOPE" }, 1);
        if (basketItem) setTimeout(() => handleSelect({ ...basketItem, category: "BASKET" }, 1), 100);
        if (burnerItem) setTimeout(() => handleSelect({ ...burnerItem, category: "BURNER" }, 1), 200);
    };

    const handleSaveQuotation = () => {
        // This function is called by LivePreview to trigger a save.
        // The useEffect already handles auto-saving, but this can be used
        // for explicit save actions if needed, or to ensure the latest state is saved.
        // For now, it just relies on the useEffect.
        console.log("Explicit save triggered (auto-save handles it)");
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            {/* Header / Client Details Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            {vendorInfo.name} <span className="text-blue-600">Configurator</span>
                        </h1>
                        <p className="text-slate-500 mt-1">Create a professional quotation in minutes.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-mono text-slate-400 mb-1">Quotation #</div>
                        <div className="text-xl font-bold text-slate-700">{quotationNumber}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1">Client Name</label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="e.g. Balloon Adventures Ltd."
                            value={clientDetails.name}
                            onChange={e => setClientDetails({ ...clientDetails, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1">Country / Region</label>
                        <input
                            type="text"
                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="e.g. Switzerland"
                            value={clientDetails.country}
                            onChange={e => setClientDetails({ ...clientDetails, country: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Catalog Section */}
                <div className="lg:col-span-2 space-y-2">
                    {/* Kit Loader Banner */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4 mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-blue-900">Predefined Kits Available</h3>
                            <p className="text-sm text-blue-700">Quickly load standard configurations.</p>
                        </div>
                        <button
                            onClick={() => setShowKitLoader(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            Browse Kits
                        </button>
                    </div>

                    {catalog.categories.map(category => (
                        <CategorySection
                            key={category.name}
                            category={category}
                            selectedItems={selectedItems}
                            selectedEnvelope={selectedEnvelope}
                            selectedBurner={selectedBurner}
                            vendorId={vendorInfo.id}
                            onSelect={handleSelect}
                            onRemove={handleRemove}
                        />
                    ))}
                </div>

                {/* Live Preview Section */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <LivePreview
                            selectedItems={selectedList}
                            total={totalAmount}
                            discount={discount}
                            onDiscountChange={setDiscount}
                            clientDetails={clientDetails}
                            onClientDetailsChange={setClientDetails}
                            quotationNumber={quotationNumber}
                            onAddCustomItem={handleAddCustomItem}
                            onRemoveItem={handleRemove}
                            vendorInfo={vendorInfo}
                            paymentTerms={paymentTerms}
                            onPaymentTermsChange={setPaymentTerms}
                        />
                    </div>
                </div>
            </div>

            {/* Kit Loader Modal */}
            {showKitLoader && (
                <KitLoader
                    isOpen={showKitLoader}
                    onClose={() => setShowKitLoader(false)}
                    onLoadKit={handleLoadKit}
                    vendorId={vendorInfo.id}
                />
            )}
        </div>
    );
}
