// Quotation storage utilities using LocalStorage

export interface SavedQuotation {
    id: string;
    vendorId: string;
    vendorName: string;
    date: string;
    clientName: string;
    clientDetails: {
        name: string;
        country: string;
        phone: string;
        email: string;
    };
    items: Array<{
        itemId: string;
        itemName: string;
        category: string;
        quantity: number;
        price: number;
        customPrice?: number;
        customDescription?: string;
    }>;
    discount: number;
    total: number;
    quotationNumber: string;
    paymentTerms?: string;
}

const STORAGE_KEY = "balloon_quotations";

export function saveQuotation(quotation: SavedQuotation): void {
    try {
        const existing = getAllQuotations();
        const updated = [...existing.filter(q => q.id !== quotation.id), quotation];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error("Error saving quotation:", error);
    }
}

export function getAllQuotations(): SavedQuotation[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error loading quotations:", error);
        return [];
    }
}

export function getQuotation(id: string): SavedQuotation | null {
    const all = getAllQuotations();
    return all.find(q => q.id === id) || null;
}

export function deleteQuotation(id: string): void {
    try {
        const existing = getAllQuotations();
        const updated = existing.filter(q => q.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error("Error deleting quotation:", error);
    }
}
