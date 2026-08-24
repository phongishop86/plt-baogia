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
      <div className="hidden print:block mb-6 text-sm font-[Times_New_Roman]">
        <div className="flex items-center space-x-6 pb-4 border-b border-gray-300 mb-4">
          <div className="w-40 flex-shrink-0">
            <img src="/PLT-logo.png" alt="PLT Logo" className="w-full h-auto max-h-32 object-contain" />
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-lg font-bold">CÔNG TY TNHH PHÁT LỘC TECH</h1>
            <p><span className="font-semibold">Địa chỉ:</span> Số 491/1 Trường Chinh, Phường Tân Bình, Thành phố Hồ Chí Minh</p>
            <p><span className="font-semibold">MST:</span> 0319347662</p>
            <p><span className="font-semibold">SĐT:</span> 0932685794</p>
            <p><span className="font-semibold">Email:</span> phatloctech.ltd@gmail.com</p>
            <p><span className="font-semibold">STK:</span> 115003041055 - VietinBank Long An</p>
          </div>
        </div>
        
        <div className="text-center mt-4">
          <h2 className="text-2xl font-bold uppercase tracking-wider">BẢNG BÁO GIÁ</h2>
          <p className="mt-1">Số: {docNumber}</p>
        </div>

        <div className="mt-6 space-y-1">
          <p><span className="font-bold inline-block w-20">Kính gửi:</span> <span className="font-bold">{selectedCustomer?.name || '....................................................................................'}</span></p>
          <p><span className="font-bold inline-block w-20">Địa chỉ:</span> {selectedCustomer?.address || '....................................................................................'}</p>
          <p><span className="font-bold inline-block w-20">MST:</span> {selectedCustomer?.taxCode || '...................'}</p>
        </div>
        
        <p className="mt-4 text-justify">
          Lời đầu tiên chúng tôi xin trân trọng gửi lời cảm ơn chân thành đến quý khách hàng đã quan tâm đến sản phẩm/dịch vụ của công ty chúng tôi. Công ty Phát Lộc Tech xin trân trọng báo giá đến quý đơn vị như sau:
        </p>
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
        <div className="mt-4 border rounded-md overflow-hidden print:border-none print:mt-2">
          <table className="min-w-full divide-y divide-gray-200 print:border-collapse print:border-2 print:border-black font-[Times_New_Roman]">
            <thead className="bg-gray-50 print:bg-gray-200">
              <tr>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase print:border print:border-black w-12 hidden print:table-cell">STT</th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase print:border print:border-black">Tên hàng hóa, dịch vụ</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase print:border print:border-black w-20">ĐVT</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase print:border print:border-black w-24">Số lượng</th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase print:border print:border-black w-32">Đơn Giá</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-gray-700 uppercase print:border print:border-black w-20 print:hidden">Thuế</th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase print:border print:border-black w-32">Thành tiền</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase print:hidden w-16"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 print:divide-black">
              {selectedItems.map((item, index) => (
                <tr key={item.tempId} className="print:border print:border-black">
                  <td className="px-2 py-2 text-sm text-center text-gray-900 print:border print:border-black hidden print:table-cell">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-900 print:border print:border-black">
                    <input 
                      type="text" 
                      value={item.name} 
                      onChange={e => updateItem(item.tempId, 'name', e.target.value)}
                      className="w-full border-none bg-transparent focus:ring-0 p-0"
                      placeholder="Nhập tên hàng hóa..."
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 text-center print:border print:border-black print:text-black">
                    <input 
                      type="text" 
                      value={item.unit} 
                      onChange={e => updateItem(item.tempId, 'unit', e.target.value)}
                      className="w-full border-none bg-transparent focus:ring-0 p-0 text-center"
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 text-center print:border print:border-black print:text-black">
                    <div className="flex flex-col items-center">
                      <input 
                        type="number" 
                        min="1" 
                        value={item.quantity}
                        onChange={(e) => updateItem(item.tempId, 'quantity', Number(e.target.value))}
                        className="w-16 text-center border rounded p-1 print:border-none print:p-0"
                      />
                      {item.id && (
                        <span className={`text-[10px] print:hidden ${item.quantity > (item.stock || 0) ? 'text-red-500' : 'text-gray-400'}`}>
                          Tồn: {item.stock || 0}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 text-right print:border print:border-black print:text-black">
                    <input 
                      type="number" 
                      value={item.unitPrice} 
                      onChange={e => updateItem(item.tempId, 'unitPrice', Number(e.target.value))}
                      className="w-full border rounded p-1 print:border-none print:p-0 text-right"
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 print:border print:border-black print:hidden">
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
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium text-right print:border print:border-black">
                    {formatCurrency(item.quantity * (item.unitPrice || 0))}
                  </td>
                  <td className="px-4 py-2 text-sm text-right print:hidden">
                    <button onClick={() => handleRemoveItem(item.tempId)} className="text-red-500 hover:text-red-700">Xóa</button>
                  </td>
                </tr>
              ))}
              <tr className="hidden print:table-row print:font-bold">
                <td colSpan={5} className="px-4 py-2 text-center print:border print:border-black uppercase">
                  VAT {selectedItems.length > 0 ? selectedItems[0].taxRate : '0'}%
                </td>
                <td className="px-4 py-2 text-right print:border print:border-black">
                  {formatCurrency(calculateTax())}
                </td>
              </tr>
              <tr className="hidden print:table-row print:font-bold">
                <td colSpan={5} className="px-4 py-2 text-center print:border print:border-black uppercase">
                  Tổng cộng
                </td>
                <td className="px-4 py-2 text-right print:border print:border-black">
                  {formatCurrency(calculateSubTotal() + calculateTax())}
                </td>
              </tr>
            </tbody>
          </table>
          
          {/* Footer hiển thị trên Web (Không in) */}
          <div className="bg-gray-50 p-4 flex justify-end print:hidden">
            <div className="text-right space-y-2">
              <p className="text-sm text-gray-600">Cộng tiền hàng: <span className="text-gray-900 font-medium ml-4 w-32 inline-block">{formatCurrency(calculateSubTotal())}</span></p>
              <p className="text-sm text-gray-600 border-b pb-2">Tiền thuế GTGT: <span className="text-gray-900 font-medium ml-4 w-32 inline-block">{formatCurrency(calculateTax())}</span></p>
              <p className="text-lg font-bold text-blue-800 pt-2">Tổng cộng: <span className="ml-4 w-32 inline-block">{formatCurrency(calculateSubTotal() + calculateTax())}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER CHO IN ẤN */}
      <div className="hidden print:block mt-6 text-sm font-[Times_New_Roman]">
        <div className="font-bold underline mb-2">Chính sách công ty:</div>
        <div className="font-bold text-xs mb-1">Giá trên bao gồm thuế VAT {selectedItems.length > 0 ? selectedItems[0].taxRate : '0'}%</div>
        <div className="font-bold text-xs mb-1">Xuất xứ, quy cách và bảo hành:</div>
        <ul className="list-none text-xs space-y-1 mb-2">
          <li>-Hàng hóa chính hãng và mới 100%</li>
          <li>-Xuất xứ theo đúng tiêu chuẩn nhà sản xuất</li>
          <li>-Thiết bị bảo hành theo quy định và thời gian của hãng kể từ ngày mua</li>
          <li>-Thi công hệ thống bảo hành 12 tháng</li>
        </ul>
        <div className="font-bold text-xs mb-1">Thời gian giao hàng kể từ khi người mua xác nhận đơn hàng: <span className="font-normal">Từ 05-07 ngày tùy theo khu vực</span></div>
        <div className="font-bold text-xs mb-1 mt-2">Thanh toán:</div>
        <ul className="list-none text-xs space-y-1 mb-4">
          <li>-Chuyển khoản hoặc tiền mặt</li>
          <li>-Thanh toán 100% trước khi nhận hàng hoặc theo thỏa thuận 2 bên</li>
        </ul>

        <div className="flex justify-end mt-8 pr-16">
          <div className="text-center">
            <p className="font-bold">Đại diện công ty</p>
            <p className="text-sm italic">(Ký và ghi họ tên)</p>
          </div>
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
