import { useState } from 'react';
import { Upload } from 'lucide-react';
import { parseInvoiceXML } from '../lib/xmlParser';
import { db } from '../db/db';

export default function XMLImport() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const text = await file.text();
      const parsed = parseInvoiceXML(text);
      
      // Save to Dexie
      const { customer, products, invoiceInfo } = parsed;
      
      // 1. Save or get Customer
      let customerId: number;
      const existingCustomer = await db.customers.where('taxCode').equals(customer.taxCode || '').first();
      if (existingCustomer && existingCustomer.id) {
        customerId = existingCustomer.id;
      } else {
        customerId = await db.customers.add(customer as any);
      }

      // 2. Save Products
      for (const prod of products) {
        const existing = await db.products.where('code').equals(prod.code || '').first();
        if (!existing) {
          await db.products.add(prod as any);
        }
      }

      // 3. Save Document
      await db.documents.add({
        type: 'INVOICE',
        docNumber: invoiceInfo.docNumber,
        customerId,
        date: invoiceInfo.date,
        subTotal: invoiceInfo.subTotal,
        taxAmount: invoiceInfo.taxAmount,
        total: invoiceInfo.total,
        items: products.map(p => ({
          productName: p.name || '',
          unit: p.unit || '',
          quantity: 1, // Default from XML might need refinement
          unitPrice: p.unitPrice || 0,
          taxRate: p.taxRate || 0,
          amount: p.unitPrice || 0
        })),
        createdAt: new Date()
      });

      setResult({ message: 'Nhập XML hóa đơn thành công!', docNumber: invoiceInfo.docNumber });
    } catch (err: any) {
      setError(err.message || 'Lỗi xử lý file XML.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900">Upload Hóa đơn XML</h3>
        <p className="mt-1 text-sm text-gray-500">Kéo thả hoặc chọn file XML Hóa đơn điện tử (TT78)</p>
      </div>
      
      <div className="mt-6 flex justify-center">
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
          <span>Chọn File XML</span>
          <input type="file" accept=".xml" className="hidden" onChange={handleFileUpload} disabled={loading} />
        </label>
      </div>

      {loading && <p className="mt-4 text-center text-blue-600">Đang xử lý...</p>}
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
          {result.message} (Số HĐ: {result.docNumber})
        </div>
      )}
    </div>
  );
}
