import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generateInvoicePDF = (shipment, invoiceId) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const filename = `INV-${invoiceId}.pdf`;
            const relativePath = `uploads/invoices/${filename}`;
            const fullPath = path.join(process.cwd(), relativePath);

            // Ensure directory exists
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const stream = fs.createWriteStream(fullPath);
            doc.pipe(stream);

            // Add content
            doc.fontSize(25).text('INVOICE', 100, 50);
            doc.fontSize(12).text(`Invoice Number: ${invoiceId}`, 100, 100);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 100, 120);

            doc.moveDown();
            doc.text(`Bill To: ${shipment.receiver_name || shipment.customer}`, 100, 150);
            doc.text(shipment.receiver_address || shipment.destination, 100, 165);

            doc.moveDown();
            doc.text('Description of Goods:', 100, 200);
            doc.text(shipment.description, 100, 215);

            doc.moveDown();
            doc.text(`Total Amount: $${shipment.price || '0.00'}`, 100, 250);

            doc.end();

            stream.on('finish', () => resolve(relativePath));
            stream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
};
