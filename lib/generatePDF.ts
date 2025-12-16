import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SelectedItem, ClientDetails } from "@/types";

// Helper to load image
const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};

interface VendorInfo {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
}

export async function generatePDF(
    items: SelectedItem[],
    total: number,
    discount: number,
    client: ClientDetails,
    quoteNo: string,
    vendor: VendorInfo,
    paymentTerms: string // New argument
) {
    const doc = new jsPDF();

    // Settings
    const margin = 14;
    const themeColor = [40, 40, 40] as [number, number, number];

    // ... (rest of simple setup) ...
    // 1. Logo (Copy of existing logic)
    try {
        // Expecting logo.jpg in public folder
        const img = await loadImage("/logo.jpg");
        const imgWidth = 50;
        const imgHeight = (img.height * imgWidth) / img.width;
        doc.addImage(img, 'JPEG', margin, 10, imgWidth, imgHeight);
    } catch (e) {
        console.warn("Logo not found", e);
        // Fallback text if no logo
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(vendor.name.toUpperCase(), margin, 25);
    }

    // 2. Header Info (Right aligned)
    doc.setFontSize(24);
    doc.setTextColor(...themeColor);
    doc.setFont("helvetica", "bold");
    doc.text("QUOTATION", 200, 25, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Ref No: ${quoteNo} `, 200, 32, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString()} `, 200, 37, { align: "right" });
    doc.text(`Valid until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()} `, 200, 42, { align: "right" });

    // 3. Sender / Receiver
    const startY = 60;

    // Sender (Left) - Dynamic vendor data
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("FROM:", margin, startY);
    doc.setFont("helvetica", "normal");
    doc.text(vendor.name, margin, startY + 5);
    doc.text(vendor.address, margin, startY + 10);
    doc.text(vendor.city, margin, startY + 15);
    doc.text(`Tel: ${vendor.phone}`, margin, startY + 20);
    doc.text(`Email: ${vendor.email}`, margin, startY + 25);

    // Receiver (Right)
    doc.setFont("helvetica", "bold");
    doc.text("TO:", 120, startY);
    doc.setFont("helvetica", "normal");
    doc.text(client.name || "[Customer Name]", 120, startY + 5);
    doc.text(client.country || "[Country]", 120, startY + 10);
    if (client.phone) doc.text(`Tel: ${client.phone} `, 120, startY + 15);
    if (client.email) doc.text(`Email: ${client.email} `, 120, startY + 20);

    // 4. Table with enhanced formatting
    const tableData = items.map(({ item, quantity, customPrice }, index) => {
        const price = customPrice !== undefined ? customPrice : item.price;
        const totalItem = price * quantity;

        // Format description with bullet points for key features
        let description = item.description || "";
        if (description) {
            // Split by newlines and add bullet points
            const lines = description.split('\n').filter(line => line.trim());
            description = lines.map(line => `• ${line.trim()}`).join('\n');
        }

        return [
            `${index + 1}`,  // Item number
            item.name,
            description,
            `€${price.toLocaleString("en-IE", { minimumFractionDigits: 2 })}`,
            quantity.toString(),
            `€${totalItem.toLocaleString("en-IE", { minimumFractionDigits: 2 })}`
        ];
    });

    const subtotal = items.reduce((sum, { item, quantity, customPrice }) => {
        const price = customPrice !== undefined ? customPrice : item.price;
        return sum + (price * quantity);
    }, 0);

    autoTable(doc, {
        startY: startY + 35,
        head: [["#", "ITEM", "DESCRIPTION", "PRICE", "QTY", "TOTAL"]],
        body: tableData,
        theme: 'striped',
        styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [30, 58, 138], // Dark blue
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 10,
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },  // #
            1: { cellWidth: 40, fontStyle: 'bold' },  // Item name
            2: { cellWidth: 70, fontSize: 8, textColor: [80, 80, 80] },  // Description
            3: { cellWidth: 25, halign: 'right' },  // Price
            4: { cellWidth: 15, halign: 'center' },  // Qty
            5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }  // Total
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        bodyStyles: {
            valign: 'top'
        }
    });

    // 5. Totals Section (Enhanced with box)
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY + 10;

    // Draw totals box
    const boxX = 130;
    const boxY = finalY;
    const boxWidth = 70;

    doc.setFillColor(248, 250, 252);
    doc.rect(boxX, boxY, boxWidth, 35, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(boxX, boxY, boxWidth, 35, 'S');

    // Subtotal
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Subtotal:", boxX + 5, boxY + 8);
    doc.text(`€${subtotal.toLocaleString("en-IE", { minimumFractionDigits: 2 })}`, boxX + boxWidth - 5, boxY + 8, { align: "right" });

    // Discount
    if (discount > 0) {
        const discountAmount = (subtotal * discount) / 100;
        doc.setTextColor(220, 38, 38); // Red for discount
        doc.text(`Discount (${discount}%):`, boxX + 5, boxY + 15);
        doc.text(`-€${discountAmount.toLocaleString("en-IE", { minimumFractionDigits: 2 })}`, boxX + boxWidth - 5, boxY + 15, { align: "right" });
    }

    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(boxX + 5, boxY + 20, boxX + boxWidth - 5, boxY + 20);

    // Total
    const finalTotal = total;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("TOTAL:", boxX + 5, boxY + 28);
    doc.text(`€${finalTotal.toLocaleString("en-IE", { minimumFractionDigits: 2 })}`, boxX + boxWidth - 5, boxY + 28, { align: "right" });

    finalY = boxY + 45;

    // 6. Notes Section (Now Dynamic)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TERMS & CONDITIONS", margin, finalY);

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(margin, finalY + 2, margin + 50, finalY + 2);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    let noteY = finalY + 8;
    // Split user input by lines
    const notes = paymentTerms.split('\n');

    notes.forEach(note => {
        // Simple bullet point logic if not already present
        const text = note.trim().startsWith("•") || note.trim().startsWith("-")
            ? note.trim()
            : `• ${note.trim()}`;

        // Handle long lines
        const splitText = doc.splitTextToSize(text, 180);
        doc.text(splitText, margin, noteY);
        noteY += (splitText.length * 4) + 2;
    });

    // 7. Footer with legal information
    const pageHeight = doc.internal.pageSize.height;
    const footerY = pageHeight - 20;

    // Footer separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, 200, footerY - 5);

    // Footer content
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");

    // Left side - Payment terms (Simplified as detailed terms are above)
    // doc.text("Payment Terms: See details above", margin, footerY);
    doc.text(`Bank Details: Contact ${vendor.email} for payment information`, margin, footerY); // Adjusted Y

    // Right side - Quote reference
    doc.text(`Quotation #${quoteNo}`, 200, footerY, { align: "right" });
    doc.text(`Issued: ${new Date().toLocaleDateString("en-GB")}`, 200, footerY + 4, { align: "right" });
    doc.text("Page 1 of 1", 200, footerY + 8, { align: "right" });

    // Save
    doc.save(`Quotation_${quoteNo}.pdf`);
}
