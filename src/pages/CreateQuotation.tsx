import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '../db/db';

interface SelectedProduct extends Product {
  quantity: number;
}

export default function CreateQuotation() {
  const customers = useLiveQuery(() => db.customers.toArray());
  const products = useLiveQuery(() => db.products.toArray());

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedItems, setSelectedItems] = useState<SelectedProduct[]>([]);
  const [docNumber, setDocNumber] = useState(`BG-${Date.now().toString().slice(-6)}`);

  const handleAddItem = (productId: number) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    if (selectedItems.find(item => item.id === productId)) {
      alert('Sản phẩm đã có trong danh sách!');
      return;
    }

    setSelectedItems([...selectedItems, { ...product, quantity: 1 }]);
  };

  const handleQuantityChange = (id: number, quantity: number) => {
    setSelectedItems(items => 
      items.map(item => {
        if (item.id === id) {
          if (quantity > (item.stock || 0)) {
            alert(`Chú ý: Số lượng (${quantity}) vượt quá tồn kho (${item.stock || 0})!`);
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: number) => {
    setSelectedItems(items => items.filter(item => item.id !== id));
  };

  const handleSaveQuotation = async () => {
    if (!selectedCustomerId || selectedItems.length === 0) {
      alert('Vui lòng chọn khách hàng và ít nhất 1 sản phẩm!');
      return;
    }

    const subTotal = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate / 100)), 0);
    const total = subTotal + taxAmount;

    await db.documents.add({
      type: 'QUOTATION',
      docNumber,
      customerId: selectedCustomerId as number,
      date: new Date(),
      subTotal,
      taxAmount,
      total,
      items: selectedItems.map(p => ({
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        taxRate: p.taxRate,
        amount: p.quantity * p.unitPrice
      })),
      createdAt: new Date()
    });

    alert('Lưu báo giá thành công!');
    // Reset form
    setSelectedCustomerId('');
    setSelectedItems([]);
    setDocNumber(`BG-${Date.now().toString().slice(-6)}`);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Số Báo Giá</label>
          <input 
            type="text" 
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Khách hàng</label>
          <select 
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
            className="w-full border-gray-300 rounded-md shadow-sm border p-2"
          >
            <option value="">-- Chọn khách hàng --</option>
            {customers?.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.taxCode})</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Thêm Sản phẩm</label>
        <select 
          onChange={(e) => {
            if (e.target.value) handleAddItem(Number(e.target.value));
            e.target.value = '';
          }}
          className="w-full border-gray-300 rounded-md shadow-sm border p-2"
          defaultValue=""
        >
          <option value="" disabled>-- Chọn để thêm vào báo giá --</option>
          {products?.map(p => (
            <option key={p.id} value={p.id}>{p.code} - {p.name} (Tồn: {p.stock || 0})</option>
          ))}
        </select>
      </div>

      {selectedItems.length > 0 && (
        <div className="mt-4 border rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên Hàng Hóa</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn Giá</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tồn kho</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedItems.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <input 
                      type="number" 
                      min="1" 
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id!, Number(e.target.value))}
                      className="w-16 border rounded p-1 text-center"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <span className={item.quantity > (item.stock || 0) ? 'text-red-600 font-bold' : 'text-green-600'}>
                      {item.stock || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatCurrency(item.unitPrice * item.quantity)}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button onClick={() => handleRemoveItem(item.id!)} className="text-red-500 hover:text-red-700">Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-gray-50 p-4 flex justify-end space-x-6">
            <div className="text-right space-y-1">
              <p className="text-sm text-gray-500">Cộng tiền hàng: <span className="text-gray-900 font-medium">{formatCurrency(selectedItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0))}</span></p>
              <p className="text-sm text-gray-500">Tiền thuế: <span className="text-gray-900 font-medium">{formatCurrency(selectedItems.reduce((s, i) => s + (i.quantity * i.unitPrice * (i.taxRate/100)), 0))}</span></p>
              <p className="text-lg font-bold text-blue-700">Tổng cộng: {formatCurrency(selectedItems.reduce((s, i) => s + (i.quantity * i.unitPrice * (1 + i.taxRate/100)), 0))}</p>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <button 
          onClick={handleSaveQuotation}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          Lưu Báo Giá
        </button>
      </div>
    </div>
  );
}
