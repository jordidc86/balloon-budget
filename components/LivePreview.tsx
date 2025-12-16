"use client";

import { useState } from "react";
import { SelectedItem, ClientDetails } from "@/types";
import { generatePDF } from "@/lib/generatePDF";

interface VendorInfo {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
}

interface LivePreviewProps {
    selectedItems: SelectedItem[];
    total: number;
    discount: number;
    onDiscountChange: (val: number) => void;
    clientDetails: ClientDetails;
    onClientDetailsChange: (details: ClientDetails) => void;
    quotationNumber: string;
    onAddCustomItem: (name: string, description: string, price: number) => void;
    onRemoveItem: (itemId: string) => void;
    vendorInfo: VendorInfo;
    paymentTerms: string;
    onPaymentTermsChange: (val: string) => void;
}

export function LivePreview({
    selectedItems,
    total,
    discount,
    onDiscountChange,
    clientDetails,
    onClientDetailsChange,
    quotationNumber,
    onAddCustomItem,
    onRemoveItem,
    vendorInfo,
    paymentTerms,
    onPaymentTermsChange
}: LivePreviewProps) {

    // Custom Item Local State
    const [customItem, setCustomItem] = useState({ name: "", description: "", price: "" });

    const handleAddCustom = () => {
        if (customItem.name && customItem.price) {
            onAddCustomItem(customItem.name, customItem.description, parseFloat(customItem.price));
            setCustomItem({ name: "", description: "", price: "" });
        }
    };

    const updateClient = (field: keyof ClientDetails, value: string) => {
        onClientDetailsChange({ ...clientDetails, [field]: value });
    };

    return (
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
                <span>Total Summary</span>
                <span className="ml-auto text-sm font-light text-slate-400">#{quotationNumber}</span>
            </h2>

            {/* Client Details Section */}
            <div className="mb-6 p-4 bg-slate-800 rounded-lg space-y-3">
                <h3 className="text-sm font-bold uppercase text-slate-400 mb-2">Customer Details</h3>
                <input
                    type="text"
                    placeholder="Customer Name"
                    value={clientDetails.name}
                    onChange={e => updateClient("name", e.target.value)}
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Country"
                        value={clientDetails.country}
                        onChange={e => updateClient("country", e.target.value)}
                        className="w-1/2 p-2 rounded bg-slate-700 border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <input
                        type="text"
                        placeholder="Phone"
                        value={clientDetails.phone}
                        onChange={e => updateClient("phone", e.target.value)}
                        className="w-1/2 p-2 rounded bg-slate-700 border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <input
                    type="email"
                    placeholder="Email"
                    value={clientDetails.email}
                    onChange={e => updateClient("email", e.target.value)}
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {selectedItems.length === 0 ? (
                <p className="text-slate-400 italic">No items selected yet.</p>
            ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedItems.map(({ item, quantity, customPrice }) => {
                        const price = customPrice !== undefined ? customPrice : item.price;
                        return (
                            <div key={item.id} className="group flex justify-between items-start text-sm border-b border-slate-800 pb-2 hover:bg-slate-800/30 px-2 py-1 rounded transition-colors">
                                <div className="flex-1">
                                    <div className="font-semibold text-slate-200">{item.name}</div>
                                    <div className="text-xs text-slate-500">
                                        {quantity} x €{price.toLocaleString("en-IE", { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="font-mono text-slate-300">
                                        €{(price * quantity).toLocaleString("en-IE", { minimumFractionDigits: 2 })}
                                    </div>
                                    <button
                                        onClick={() => onRemoveItem(item.id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded p-1 transition-all"
                                        title="Remove item"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Custom Item Form */}
            <div className="mb-6 p-4 bg-slate-800 rounded-lg space-y-3 border border-slate-700">
                <h3 className="text-sm font-bold uppercase text-slate-400 mb-2">Add Custom Item</h3>
                <input
                    type="text"
                    placeholder="Item Name"
                    value={customItem.name}
                    onChange={e => setCustomItem({ ...customItem, name: e.target.value })}
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                    type="text"
                    placeholder="Description (Optional)"
                    value={customItem.description}
                    onChange={e => setCustomItem({ ...customItem, description: e.target.value })}
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Price (€)"
                        value={customItem.price}
                        onChange={e => setCustomItem({ ...customItem, price: e.target.value })}
                        className="w-2/3 p-2 rounded bg-slate-700 border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                        onClick={handleAddCustom}
                        disabled={!customItem.name || !customItem.price}
                        className="w-1/3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 rounded font-bold text-sm transition-colors"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Discount Section */}
            <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400 text-sm">Discount (%)</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={discount}
                            onChange={(e) => onDiscountChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                            className="w-16 p-1 rounded bg-slate-800 border border-slate-600 text-right text-sm font-mono text-red-400"
                        />
                        <span className="text-slate-500 text-sm">%</span>
                    </div>
                </div>

                <div className="flex justify-between items-center text-xl font-bold mt-4 pt-4 border-t border-slate-700">
                    <span>TOTAL</span>
                    <span className="text-green-400">€{total.toLocaleString("en-IE", { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Payment Terms Section */}
            <div className="mt-6 pt-4 border-t border-slate-700">
                <label className="text-slate-400 text-sm font-bold uppercase mb-2 block">Terms & Conditions</label>
                <textarea
                    rows={4}
                    value={paymentTerms}
                    onChange={(e) => onPaymentTermsChange(e.target.value)}
                    className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-xs text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter payment terms and conditions..."
                />
            </div>

            <button
                onClick={() => generatePDF(selectedItems, total, discount, clientDetails, quotationNumber, vendorInfo, paymentTerms)}
                disabled={selectedItems.length === 0}
                className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-900/50"
            >
                Download PDF Quotation
            </button>
        </div>
    );
}

