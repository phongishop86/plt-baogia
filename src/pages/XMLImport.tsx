import { useState } from 'react';
import { Upload } from 'lucide-react';
import { parseInvoiceXML } from '../lib/xmlParser';
import { db } from '../db/db';

export default function XMLImport() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [invoiceType, setInvoiceType] = useState<'INPUT' | 'OUTPUT'>('OUTPUT');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const newResults: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const parsed = parseInvoiceXML(text);
        
        const { buyer, seller, products, invoiceInfo } = parsed;
        
        // Check for duplicates
        const docType = invoiceType === 'INPUT' ? 'INPUT_INVOICE' : 'OUTPUT_INVOICE';
        const existingDoc = await db.documents
          .where('docNumber').equals(invoiceInfo.docNumber)
          .and(doc => doc.type === docType)
          .first();
          
        if (existingDoc) {
          throw new Error(`Hóa đơn số ${invoiceInfo.docNumber} đã tồn tại trong hệ thống.`);
        }
        
        // Determine the counterpart based on invoice type
        // INPUT invoice (Mua vào): the counterpart is the Seller (Nhà cung cấp)
        // OUTPUT invoice (Bán ra): the counterpart is the Buyer (Khách hàng)
        const counterpart = invoiceType === 'INPUT' ? seller : buyer;
        
        // 1. Save or get Counterpart (Customer/Partner)
        let customerId: number;
        const existingCustomer = await db.customers.where('taxCode').equals(counterpart.taxCode || '').first();
        if (existingCustomer && existingCustomer.id) {
          customerId = existingCustomer.id;
        } else {
          customerId = await db.customers.add(counterpart as any);
        }

        // 2. Save Products and Update Stock
        for (const prod of products) {
          if (!prod.code && !prod.name) continue;
          
          const existing = await db.products.where('code').equals(prod.code || '').first();
          let newStock = 0;
          const qty = prod.quantity || 1;
          
          if (!existing) {
            newStock = invoiceType === 'INPUT' ? qty : -qty;
            await db.products.add({
              code: prod.code,
              name: prod.name,
              unit: prod.unit,
              unitPrice: prod.unitPrice,
              taxRate: prod.taxRate,
              stock: newStock
            });
          } else {
            const currentStock = existing.stock || 0;
            newStock = invoiceType === 'INPUT' ? currentStock + qty : currentStock - qty;
            await db.products.update(existing.id!, { stock: newStock, unitPrice: prod.unitPrice }); // Update price as well
          }
        }
        
        // 3. Save Document
        await db.documents.add({
          type: invoiceType === 'INPUT' ? 'INPUT_INVOICE' : 'OUTPUT_INVOICE',
          docNumber: invoiceInfo.docNumber,
          customerId,
          date: invoiceInfo.date,
          subTotal: invoiceInfo.subTotal,
          taxAmount: invoiceInfo.taxAmount,
          total: invoiceInfo.total,
          items: products.map((p: any) => ({
            productName: p.name || '',
            unit: p.unit || '',
            quantity: p.quantity || 1, 
            unitPrice: p.unitPrice || 0,
            taxRate: p.taxRate || 0,
            amount: p.amount || (p.quantity * p.unitPrice)
          })),
          createdAt: new Date()
        });

        newResults.push({ file: file.name, status: 'success', docNumber: invoiceInfo.docNumber });
      } catch (err: any) {
        newResults.push({ file: file.name, status: 'error', message: err.message || 'Lỗi xử lý file XML' });
      }
    }

    setResults(prev => [...newResults, ...prev]);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto mt-8 p-8 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="text-center mb-8">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900">Import Hóa Đơn Điện Tử (XML hàng loạt)</h3>
        <p className="mt-2 text-sm text-gray-500">Kéo thả hoặc chọn nhiều file XML chuẩn Thông tư 78</p>
      </div>
      
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="flex items-center space-x-4">
          <label className="font-medium text-gray-700">Loại Hóa Đơn:</label>
          <select 
            value={invoiceType} 
            onChange={(e) => setInvoiceType(e.target.value as 'INPUT' | 'OUTPUT')}
            className="border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="OUTPUT">Hóa đơn Bán ra (Ghi nhận Doanh thu & Giảm kho)</option>
            <option value="INPUT">Hóa đơn Mua vào (Ghi nhận Chi phí & Tăng kho)</option>
          </select>
        </div>

        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors font-medium">
          <span>Chọn Các File XML</span>
          <input type="file" accept=".xml" multiple className="hidden" onChange={handleFileUpload} disabled={loading} />
        </label>
      </div>

      {loading && <p className="mt-6 text-center text-blue-600 font-medium">Đang xử lý các file...</p>}
      
      {results.length > 0 && (
        <div className="mt-8">
          <h4 className="font-medium text-gray-900 mb-4">Kết quả Import:</h4>
          <div className="space-y-3">
            {results.map((res, idx) => (
              <div key={idx} className={`p-4 rounded-md border ${res.status === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <span className="font-semibold">{res.file}:</span> {res.status === 'success' ? `Thành công (Số HĐ: ${res.docNumber})` : `Lỗi - ${res.message}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
