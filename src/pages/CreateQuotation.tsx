import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '../db/db';
import { Printer } from 'lucide-react';

interface SelectedProduct extends Partial<Product> {
  tempId: string; // Cho các dòng nhập thủ công
  quantity: number;
}

interface CreateQuotationProps {
  prefilledProducts?: number[];
  clearPrefilled?: () => void;
  editingQuotationId?: number | null;
  clearEditingQuotation?: () => void;
}

export default function CreateQuotation({ prefilledProducts = [], clearPrefilled, editingQuotationId, clearEditingQuotation }: CreateQuotationProps) {
  const customers = useLiveQuery(() => db.customers.toArray());
  const products = useLiveQuery(() => db.products.toArray());

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedItems, setSelectedItems] = useState<SelectedProduct[]>([]);
  const [docNumber, setDocNumber] = useState(`BG-${Date.now().toString().slice(-6)}`);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [createdDocId, setCreatedDocId] = useState<number | null>(null);

  // Modal tạo khách hàng mới
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', taxCode: '', address: '', phone: '', email: '' });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.taxCode) {
      alert('Vui lòng nhập Tên và Mã số thuế!');
      return;
    }
    try {
      const id = await db.customers.add({ ...newCustomer, createdAt: new Date(), isSupplier: false });
      setSelectedCustomerId(id as number);
      setIsCustomerModalOpen(false);
      setNewCustomer({ name: '', taxCode: '', address: '', phone: '', email: '' });
    } catch (err: any) {
      alert('Lỗi khi lưu khách hàng: ' + err.message);
    }
  };

  // Tự động nạp sản phẩm được tick chọn từ trang Tồn Kho
  useEffect(() => {
    if (prefilledProducts.length > 0 && products && selectedItems.length === 0 && !editingQuotationId) {
      const itemsToAdd = products
        .filter(p => prefilledProducts.includes(p.id!))
        .map(product => ({
          ...product,
          tempId: Date.now().toString() + Math.random().toString(),
          quantity: 1
        }));
      
      setSelectedItems(itemsToAdd);
      if (clearPrefilled) clearPrefilled();
    }
  }, [prefilledProducts, products, editingQuotationId]);

  // Load báo giá đang sửa (nếu có)
  useEffect(() => {
    async function loadEditingQuotation() {
      if (editingQuotationId && products) {
        const doc = await db.documents.get(editingQuotationId);
        if (doc && doc.type === 'QUOTATION') {
          setDocNumber(doc.docNumber);
          setSelectedCustomerId(doc.customerId);
          
          // Phục hồi items
          const itemsToLoad: SelectedProduct[] = doc.items.map((item: any) => {
            const originalProduct = products.find(p => p.id === item.productId);
            return {
              id: item.productId,
              tempId: Date.now().toString() + Math.random().toString(),
              name: item.productName,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              stock: originalProduct ? originalProduct.stock : 0
            };
          });
          
          setSelectedItems(itemsToLoad);
          setCreatedDocId(editingQuotationId); // Đánh dấu ID đang edit
        }
      } else if (!editingQuotationId && selectedItems.length > 0 && !prefilledProducts.length && !createdDocId) {
         // Clear when opening new (chỉ clear khi chuyển tab tạo mới, không clear nếu đang làm việc)
         setDocNumber(`BG-${Date.now().toString().slice(-6)}`);
         setSelectedCustomerId('');
         setSelectedItems([]);
         setCreatedDocId(null);
      }
    }
    loadEditingQuotation();
  }, [editingQuotationId, products]);

  const handleAddItemFromDB = (productId: number) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;
    
    setSelectedItems(prev => [...prev, { ...product, tempId: Date.now().toString(), quantity: 1 }]);
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

  const handleSaveQuotation = async (status: 'DRAFT' | 'PENDING') => {
    if (!selectedCustomerId || selectedItems.length === 0) {
      alert('Vui lòng chọn khách hàng và ít nhất 1 sản phẩm!');
      return;
    }

    const subTotal = calculateSubTotal();
    const taxAmount = calculateTax();
    const total = subTotal + taxAmount;

    const docData = {
      type: 'QUOTATION' as const,
      docNumber,
      customerId: selectedCustomerId as number,
      date: new Date(),
      subTotal,
      taxAmount,
      total,
      status, // 'DRAFT' hoặc 'PENDING'
      items: selectedItems.map(p => ({
        productId: p.id,
        productName: p.name || 'Hàng hóa chưa tên',
        unit: p.unit || '',
        quantity: p.quantity,
        unitPrice: p.unitPrice || 0,
        taxRate: p.taxRate || 0,
        amount: p.quantity * (p.unitPrice || 0)
      }))
    };

    const activeDocId = editingQuotationId || createdDocId;

    if (activeDocId) {
      await db.documents.update(activeDocId, docData);
      alert(status === 'DRAFT' ? 'Đã cập nhật nháp báo giá!' : 'Đã cập nhật báo giá chờ phát hành!');
    } else {
      const newId = await db.documents.add({
        ...docData,
        createdAt: new Date()
      });
      setCreatedDocId(newId as number);
      alert(status === 'DRAFT' ? 'Đã lưu nháp báo giá!' : 'Đã lưu báo giá chờ phát hành!');
    }
  };

  const handleClearForm = () => {
    if (confirm('Bạn muốn xóa trắng biểu mẫu để tạo báo giá mới?')) {
      if (clearEditingQuotation) clearEditingQuotation();
      setDocNumber(`BG-${Date.now().toString().slice(-6)}`);
      setSelectedCustomerId('');
      setSelectedItems([]);
      setCreatedDocId(null);
    }
  };

  const handlePrint = () => {
    if (!selectedCustomerId) {
      alert('Vui lòng chọn khách hàng để in báo giá!');
      return;
    }
    window.print();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  
  // Chỉ lấy sản phẩm có tồn kho > 0
  const availableProducts = products?.filter(p => (p.stock || 0) > 0) || [];
  const searchNormalized = searchQuery.trim().toLowerCase();
  
  // Thuật toán tìm kiếm tương đối
  const filteredProducts = availableProducts.filter(p => {
    if (!searchNormalized) return true;
    return (p.name?.toLowerCase().includes(searchNormalized) || p.code?.toLowerCase().includes(searchNormalized));
  });

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  const handleSendEmail = () => {
    if (!selectedCustomerId) {
      alert('Vui lòng chọn khách hàng!');
      return;
    }
    const customer = customers?.find(c => c.id === selectedCustomerId);
    const customerEmail = customer?.email || '';
    
    const subject = encodeURIComponent(`Báo giá ${docNumber} - Công ty TNHH Phát Lộc Tech`);
    const body = encodeURIComponent(
      `Kính gửi ${customer?.name || 'Quý khách hàng'},\n\n` +
      `Công ty TNHH Phát Lộc Tech xin trân trọng gửi đến Quý đơn vị bảng báo giá ${docNumber} mới nhất.\n` +
      `Tổng giá trị báo giá: ${formatCurrency(calculateSubTotal() + calculateTax())}.\n\n` +
      `Vui lòng xem file PDF Báo giá đính kèm ở email này để biết chi tiết các hạng mục.\n\n` +
      `Nếu Quý khách có bất kỳ thắc mắc nào, xin vui lòng phản hồi lại email này hoặc liên hệ hotline: 0932685794.\n\n` +
      `Trân trọng cảm ơn,\nPhát Lộc Tech`
    );

    window.location.href = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
    
    alert('Đã mở ứng dụng gửi Mail.\n\nLƯU Ý: Bạn nhớ ĐÍNH KÈM FILE PDF BÁO GIÁ vào email trước khi bấm Gửi nhé!');
  };

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

      <div className="flex justify-between items-center print:hidden mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Thông tin chung</h3>
        <button 
          onClick={handleClearForm}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md border font-medium transition-colors"
        >
          🔄 Tạo mới từ đầu (Xóa trắng)
        </button>
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
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Khách hàng</label>
            <button 
              onClick={() => setIsCustomerModalOpen(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
            >
              + Tạo khách hàng mới
            </button>
          </div>
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
        <div className="flex-1 relative">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            placeholder="🔍 Gõ tên hoặc mã sản phẩm để tìm kiếm..."
            className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {isDropdownOpen && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm mt-1">
              {filteredProducts.length === 0 ? (
                <li className="text-gray-500 relative cursor-default select-none py-2 px-3">
                  Không tìm thấy sản phẩm hoặc sản phẩm đã hết hàng.
                </li>
              ) : (
                filteredProducts.map(p => (
                  <li 
                    key={p.id} 
                    onClick={() => {
                      handleAddItemFromDB(p.id!);
                      setSearchQuery('');
                      setIsDropdownOpen(false);
                    }}
                    className="text-gray-900 cursor-pointer select-none relative py-2 px-3 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <span className="block font-medium truncate">{p.name}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Mã: <span className="font-medium text-gray-700">{p.code || '-'}</span> | 
                      Tồn: <span className="font-medium text-green-600">{p.stock}</span> | 
                      Giá: {new Intl.NumberFormat('vi-VN').format(p.unitPrice)} ₫
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
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
                  <td className="px-2 py-2 text-sm text-center text-gray-900 print:border print:border-black hidden print:table-cell align-top">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-900 print:border print:border-black align-top">
                    {/* UI Nhập liệu trên Web: Tự động dãn dòng theo nội dung */}
                    <div className="relative print:hidden">
                      <div className="invisible whitespace-pre-wrap break-words min-h-[1.5rem] w-full pb-1">
                        {item.name + ' '}
                      </div>
                      <textarea 
                        value={item.name} 
                        onChange={e => updateItem(item.tempId, 'name', e.target.value)}
                        className="absolute inset-0 w-full h-full border-none bg-transparent focus:ring-0 p-0 resize-none overflow-hidden"
                        placeholder="Nhập tên hàng hóa..."
                      />
                    </div>
                    {/* UI Bản In: Render text thô để chắc chắn không bao giờ bị cắt chữ */}
                    <div className="hidden print:block whitespace-pre-wrap break-words">
                      {item.name}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 text-center print:border print:border-black print:text-black align-top">
                    <input 
                      type="text" 
                      value={item.unit} 
                      onChange={e => updateItem(item.tempId, 'unit', e.target.value)}
                      className="w-full border-none bg-transparent focus:ring-0 p-0 text-center"
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 text-center print:border print:border-black print:text-black align-top">
                    <div className="flex flex-col items-center">
                      <input 
                        type="text" 
                        value={item.quantity ? new Intl.NumberFormat('vi-VN').format(item.quantity) : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          updateItem(item.tempId, 'quantity', Number(val));
                        }}
                        className="w-16 text-center border rounded p-1 print:border-none print:p-0"
                      />
                      {item.id && (
                        <span className={`text-[10px] print:hidden ${item.quantity > (item.stock || 0) ? 'text-red-500' : 'text-gray-400'}`}>
                          Tồn: {item.stock ? new Intl.NumberFormat('vi-VN').format(item.stock) : 0}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 text-right print:border print:border-black print:text-black align-top">
                    <input 
                      type="text" 
                      value={item.unitPrice ? new Intl.NumberFormat('vi-VN').format(item.unitPrice) : ''} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        updateItem(item.tempId, 'unitPrice', Number(val));
                      }}
                      className="w-full border rounded p-1 print:border-none print:p-0 text-right"
                    />
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500 print:border print:border-black print:hidden align-top">
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
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium text-right print:border print:border-black align-top pt-3">
                    {formatCurrency(item.quantity * (item.unitPrice || 0))}
                  </td>
                  <td className="px-4 py-2 text-sm text-right print:hidden align-top pt-3">
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
      <div className="hidden print:flex justify-between items-start mt-6 text-sm font-[Times_New_Roman]">
        <div className="flex-1 pr-4">
          <div className="font-bold underline mb-2 text-base">Chính sách công ty:</div>
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
        </div>

        <div className="w-64 flex flex-col items-center pt-8">
          <p className="font-bold text-base">Đại diện công ty</p>
          <p className="text-sm italic">(Ký và ghi họ tên)</p>
        </div>
      </div>

      <div className="pt-6 flex justify-end space-x-4 print:hidden border-t">
        {editingQuotationId && (
          <button 
            onClick={() => {
              if (clearEditingQuotation) clearEditingQuotation();
              setDocNumber(`BG-${Date.now().toString().slice(-6)}`);
              setSelectedCustomerId('');
              setSelectedItems([]);
              setCreatedDocId(null);
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md font-medium transition-colors"
          >
            Hủy Sửa
          </button>
        )}
        <button 
          onClick={handleSendEmail}
          className="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-6 py-2 rounded-md font-medium transition-colors border border-blue-200"
        >
          <span>📧 Gửi Email</span>
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          <Printer size={18} />
          <span>In Báo Giá</span>
        </button>
        <button 
          onClick={() => handleSaveQuotation('DRAFT')}
          className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          {(editingQuotationId || createdDocId) ? 'Cập nhật Nháp' : 'Lưu Nháp (Draft)'}
        </button>
        <button 
          onClick={() => handleSaveQuotation('PENDING')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          {(editingQuotationId || createdDocId) ? 'Cập nhật & Chốt' : 'Lưu & Chờ gửi'}
        </button>
      </div>

      {/* Modal Tạo khách hàng nhanh */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Thêm Khách hàng mới</h2>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên khách hàng / Đơn vị *</label>
                <input required type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full border rounded p-2" placeholder="Ví dụ: Công ty TNHH ABC" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế *</label>
                <input required type="text" value={newCustomer.taxCode} onChange={e => setNewCustomer({...newCustomer, taxCode: e.target.value})} className="w-full border rounded p-2" placeholder="Ví dụ: 0312345678" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input type="text" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="w-full border rounded p-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input type="text" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full border rounded p-2" />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Lưu & Chọn</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
