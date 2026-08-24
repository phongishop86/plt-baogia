import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '../db/db';
import { Printer } from 'lucide-react';

interface SelectedProduct extends Partial<Product> {
  tempId: string; // Cho các dòng nhập thủ công
  quantity: number;
}

export default function CreateQuotation() {
  const customers = useLiveQuery(() => db.customers.toArray());
  const products = useLiveQuery(() => db.products.toArray());

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedItems, setSelectedItems] = useState<SelectedProduct[]>([]);
  const [docNumber, setDocNumber] = useState(`BG-${Date.now().toString().slice(-6)}`);

  const handleAddItemFromDB = (productId: number) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;
    
    setSelectedItems([...selectedItems, { ...product, tempId: Date.now().toString(), quantity: 1 }]);
  };

  const handleAddManualRow = () => {
    setSelectedItems([
      ...selectedItems, 
      { 
        tempId: Date.now().toString(), 
        name: '', 
        unit: 'Cái', 
        quantity: 1, 
        unitPrice: 0, 
        taxRate: 10,
        stock: 0
      }
    ]);
  };

  const updateItem = (tempId: string, field: keyof SelectedProduct, value: any) => {
    setSelectedItems(items => 
      items.map(item => {
        if (item.tempId === tempId) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' && updated.id && value > (updated.stock || 0)) {
            // alert(`Chú ý: Số lượng (${value}) vượt quá tồn kho (${updated.stock || 0})!`);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (tempId: string) => {
    setSelectedItems(items => items.filter(item => item.tempId !== tempId));
  };

  const calculateSubTotal = () => selectedItems.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0);
  const calculateTax = () => selectedItems.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0) * ((item.taxRate || 0)/100)), 0);

  const handleSaveQuotation = async () => {
    if (!selectedCustomerId || selectedItems.length === 0) {
      alert('Vui lòng chọn khách hàng và ít nhất 1 sản phẩm!');
      return;
    }

    const subTotal = calculateSubTotal();
    const taxAmount = calculateTax();
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
        productName: p.name || 'Hàng hóa chưa tên',
        unit: p.unit || '',
        quantity: p.quantity,
        unitPrice: p.unitPrice || 0,
        taxRate: p.taxRate || 0,
        amount: p.quantity * (p.unitPrice || 0)
      })),
      createdAt: new Date()
    });

    alert('Lưu báo giá thành công!');
  };

  const handlePrint = () => {
    if (!selectedCustomerId) {
      alert('Vui lòng chọn khách hàng để in báo giá!');
      return;
    }
    window.print();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 print:shadow-none print:border-none print:p-0">
      
      {/* HEADER CHO IN ẤN (Chỉ hiển thị khi in) */}
      <div className="hidden print:block mb-8">
        <div className="flex justify-between items-start border-b-2 border-blue-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">CÔNG TY TNHH PHÁT LỘC TECH</h1>
            <p className="text-sm">Mã số thuế: 0123456789</p>
            <p className="text-sm">Địa chỉ: 123 Đường Công Nghệ, Hà Nội</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-widest">BÁO GIÁ</h2>
            <p className="font-semibold mt-2">Số: {docNumber}</p>
            <p className="text-sm italic">Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="font-bold text-lg">Kính gửi: {selectedCustomer?.name || '................................'}</h3>
          <p>Mã số thuế: {selectedCustomer?.taxCode}</p>
          <p>Địa chỉ: {selectedCustomer?.address}</p>
          <p>Điện thoại: {selectedCustomer?.phone}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 print:hidden">
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

      <div className="print:hidden flex space-x-4">
        <div className="flex-1">
          <select 
            onChange={(e) => {
              if (e.target.value) handleAddItemFromDB(Number(e.target.value));
              e.target.value = '';
            }}
            className="w-full border-gray-300 rounded-md shadow-sm border p-2"
            defaultValue=""
          >
            <option value="" disabled>-- Chọn sản phẩm từ kho --</option>
            {products?.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name} (Tồn: {p.stock || 0})</option>
            ))}
          </select>
        </div>
        <button 
          onClick={handleAddManualRow}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-medium border transition-colors"
        >
          + Thêm dòng trống (Tự nhập)
        </button>
      </div>

      {selectedItems.length > 0 && (
        <div className="mt-4 border rounded-md overflow-hidden print:border-none print:mt-8">
          <table className="min-w-full divide-y divide-gray-200 print:border-collapse print:border">
            <thead className="bg-gray-50 print:bg-blue-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase print:border">Tên Hàng Hóa</th>
                <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase print:border w-20">ĐVT</th>
                <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase print:border w-24">Số lượng</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase print:border w-32">Đơn Giá</th>
                <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase print:border w-20">Thuế</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase print:border w-32">Thành tiền</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase print:hidden w-16"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedItems.map(item => (
                <tr key={item.tempId} className="print:border">
                  <td className="px-2 py-2 text-sm text-gray-900 print:border">
                    <input 
                      type="text" 
                      value={item.name} 
                      onChange={e => updateItem(item.tempId, 'name', e.target.value)}
                      className="w-full border-none bg-transparent focus:ring-0 p-0"
                      placeholder="Nhập tên hàng hóa..."
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 print:border">
                    <input 
                      type="text" 
                      value={item.unit} 
                      onChange={e => updateItem(item.tempId, 'unit', e.target.value)}
                      className="w-full border-none bg-transparent focus:ring-0 p-0"
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 print:border">
                    <div className="flex flex-col">
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity}
                        onChange={(e) => updateItem(item.tempId, 'quantity', Number(e.target.value))}
                        className="w-full border rounded p-1 print:border-none print:p-0"
                      />
                      {item.id && (
                        <span className={`text-[10px] print:hidden ${item.quantity > (item.stock || 0) ? 'text-red-500' : 'text-gray-400'}`}>
                          Tồn: {item.stock || 0}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 print:border">
                    <input 
                      type="number" 
                      value={item.unitPrice} 
                      onChange={e => updateItem(item.tempId, 'unitPrice', Number(e.target.value))}
                      className="w-full border rounded p-1 print:border-none print:p-0"
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 print:border">
                    <select 
                      value={item.taxRate} 
                      onChange={e => updateItem(item.tempId, 'taxRate', Number(e.target.value))}
                      className="w-full border rounded p-1 print:appearance-none print:border-none print:p-0 bg-transparent"
                    >
                      <option value="0">0%</option>
                      <option value="8">8%</option>
                      <option value="10">10%</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium print:border">
                    {formatCurrency(item.quantity * (item.unitPrice || 0))}
                  </td>
                  <td className="px-4 py-2 text-sm text-right print:hidden">
                    <button onClick={() => handleRemoveItem(item.tempId)} className="text-red-500 hover:text-red-700">Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="bg-gray-50 p-4 flex justify-end print:bg-white print:p-0 print:mt-4">
            <div className="text-right space-y-2">
              <p className="text-sm text-gray-600">Cộng tiền hàng: <span className="text-gray-900 font-medium ml-4 w-32 inline-block">{formatCurrency(calculateSubTotal())}</span></p>
              <p className="text-sm text-gray-600 border-b pb-2 print:border-none print:pb-0">Tiền thuế GTGT: <span className="text-gray-900 font-medium ml-4 w-32 inline-block">{formatCurrency(calculateTax())}</span></p>
              <p className="text-lg font-bold text-blue-800 pt-2">Tổng cộng: <span className="ml-4 w-32 inline-block">{formatCurrency(calculateSubTotal() + calculateTax())}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER CHO IN ẤN */}
      <div className="hidden print:flex justify-between mt-16 px-10">
        <div className="text-center">
          <p className="font-bold">ĐẠI DIỆN KHÁCH HÀNG</p>
          <p className="text-sm italic">(Ký, ghi rõ họ tên)</p>
        </div>
        <div className="text-center">
          <p className="font-bold">ĐẠI DIỆN CÔNG TY</p>
          <p className="text-sm italic">(Ký, ghi rõ họ tên)</p>
        </div>
      </div>

      <div className="pt-6 flex justify-end space-x-4 print:hidden border-t">
        <button 
          onClick={handlePrint}
          className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          <Printer size={18} />
          <span>In Báo Giá</span>
        </button>
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
