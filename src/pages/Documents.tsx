import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export default function Documents() {
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const documents = useLiveQuery(async () => {
    const docs = await db.documents.toArray();
    // sort desc by date
    docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Promise.all(docs.map(async (doc) => {
      const customer = await db.customers.get(doc.customerId);
      return { ...doc, customer };
    }));
  });

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  const exportDocx = () => {
    alert('Tính năng xuất Word đang được hoàn thiện. Tạm thời bạn có thể dùng tính năng Xem chi tiết (Preview).');
  }

  const handleDelete = async (doc: any) => {
    if (!confirm(`Bạn có chắc muốn xóa chứng từ số ${doc.docNumber}?\n(Hệ thống sẽ tự động tính toán lại tồn kho)`)) {
      return;
    }
    
    // Hoàn lại tồn kho
    for (const item of doc.items) {
      // Find product by name since productId might be missing for XML imports
      const product = await db.products.where('name').equals(item.productName).first();
      if (product && product.id) {
        let newStock = product.stock || 0;
        if (doc.type === 'INPUT_INVOICE') {
          newStock -= item.quantity; // Revert purchase -> decrease stock
        } else if (doc.type === 'OUTPUT_INVOICE' || doc.type === 'QUOTATION') {
          newStock += item.quantity; // Revert sale -> increase stock
        }
        await db.products.update(product.id, { stock: newStock });
      }
    }

    await db.documents.delete(doc.id);
  }

  const handleUpdatePaymentStatus = async (id: number, date: Date | null) => {
    await db.documents.update(id, { paymentDate: date || undefined });
    // Update preview doc state to reflect changes immediately
    const updatedDoc = await db.documents.get(id);
    if (updatedDoc) {
      const customer = await db.customers.get(updatedDoc.customerId);
      setPreviewDoc({ ...updatedDoc, customer });
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số HĐ/CT</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đối tác</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents?.map((doc) => (
            <tr key={doc.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{doc.docNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`px-2 py-1 text-xs rounded-full ${doc.type === 'INPUT_INVOICE' ? 'bg-blue-100 text-blue-800' : doc.type === 'OUTPUT_INVOICE' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                  {doc.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.date).toLocaleDateString('vi-VN')}</td>
              <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{doc.customer?.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{formatNumber(doc.total)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-3">
                <button 
                  className="text-indigo-600 hover:text-indigo-900 font-medium"
                  onClick={() => setPreviewDoc(doc)}
                >
                  Xem chi tiết
                </button>
                <button 
                  className="text-red-500 hover:text-red-700 font-medium"
                  onClick={() => handleDelete(doc)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
          {documents?.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Chưa có chứng từ nào</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Preview: {previewDoc.docNumber}</h2>
              <div className="space-x-3">
                <button 
                  onClick={() => exportDocx()}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                >
                  Xuất Word
                </button>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300"
                >
                  Đóng
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Loại chứng từ:</p>
                  <p className="font-bold">{previewDoc.type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Ngày lập:</p>
                  <p className="font-bold">{new Date(previewDoc.date).toLocaleDateString('vi-VN')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Khách hàng / Đối tác:</p>
                  <p className="font-bold">{previewDoc.customer?.name}</p>
                  <p>MST: {previewDoc.customer?.taxCode} - Đ/c: {previewDoc.customer?.address}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden mt-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">STT</th>
                      <th className="px-4 py-2 text-left">Tên hàng hóa</th>
                      <th className="px-4 py-2 text-center">ĐVT</th>
                      <th className="px-4 py-2 text-center">Số lượng</th>
                      <th className="px-4 py-2 text-right">Đơn giá</th>
                      <th className="px-4 py-2 text-center">Thuế</th>
                      <th className="px-4 py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {previewDoc.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-center">{idx + 1}</td>
                        <td className="px-4 py-2">{item.productName}</td>
                        <td className="px-4 py-2 text-center">{item.unit}</td>
                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-center">{item.taxRate}%</td>
                        <td className="px-4 py-2 text-right font-medium">{formatNumber(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end text-sm space-y-1">
                <div className="text-right w-64">
                  <p className="flex justify-between text-gray-600"><span>Cộng tiền hàng:</span> <span className="font-medium">{formatNumber(previewDoc.subTotal)}</span></p>
                  <p className="flex justify-between text-gray-600"><span>Tiền thuế:</span> <span className="font-medium">{formatNumber(previewDoc.taxAmount)}</span></p>
                  <p className="flex justify-between text-lg font-bold text-blue-800 mt-2 border-t pt-2"><span>Tổng cộng:</span> <span>{formatNumber(previewDoc.total)}</span></p>
                </div>
              </div>
              
              {/* PHẦN THANH TOÁN (CÔNG NỢ) */}
              {(previewDoc.type === 'INPUT_INVOICE' || previewDoc.type === 'OUTPUT_INVOICE') && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Tình trạng thanh toán (Công nợ)</h3>
                  {previewDoc.paymentDate ? (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-green-900">Đã thanh toán</p>
                        <p className="text-sm">Ngày thanh toán: {new Date(previewDoc.paymentDate).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <button 
                        onClick={() => handleUpdatePaymentStatus(previewDoc.id, null)}
                        className="bg-white text-gray-600 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm font-medium"
                      >
                        Hủy thanh toán
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-amber-900">
                          {previewDoc.type === 'INPUT_INVOICE' ? 'Chưa thanh toán (Phải trả)' : 'Chưa thanh toán (Phải thu)'}
                        </p>
                        <p className="text-sm">Vui lòng cập nhật khi có giao dịch.</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="date" 
                          id="payment-date-input"
                          defaultValue={new Date().toISOString().split('T')[0]} 
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                        />
                        <button 
                          onClick={() => {
                            const dateVal = (document.getElementById('payment-date-input') as HTMLInputElement).value;
                            handleUpdatePaymentStatus(previewDoc.id, new Date(dateVal));
                          }}
                          className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-sm font-medium"
                        >
                          Xác nhận Đã TT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
