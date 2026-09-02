import { useLiveQuery } from 'dexie-react-hooks';
import { db, type User } from '../db/db';
import { useMemo, useState } from 'react';
import { CheckSquare, FileText, Search, Edit2, Save, X } from 'lucide-react';

interface ProductsProps {
  onNavigate?: (tab: string) => void;
  setPrefilledProducts?: (ids: number[]) => void;
  currentUser?: User | null;
}

export default function Products({ onNavigate, setPrefilledProducts, currentUser }: ProductsProps) {
  const products = useLiveQuery(() => db.products.toArray());
  const documents = useLiveQuery(() => db.documents.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PRODUCT' | 'SOLD_OUT' | 'SERVICE' | 'EXPENSE'>('PRODUCT');
  
  // Trạng thái đang chỉnh sửa
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'PRODUCT' | 'SERVICE' | 'EXPENSE'>('PRODUCT');
  const [editCategory, setEditCategory] = useState('');

  const [soldModal, setSoldModal] = useState<{ isOpen: boolean; productIds: number[] } | null>(null);
  const [soldDate, setSoldDate] = useState(new Date().toISOString().split('T')[0]);
  const [soldCustomerId, setSoldCustomerId] = useState<string>('');
  const [soldDocNumber, setSoldDocNumber] = useState('');
  const [soldTotalAmount, setSoldTotalAmount] = useState<number | ''>('');

  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    product: any;
    history: any[];
  }>({ isOpen: false, product: null, history: [] });

  const openHistoryModal = async (product: any) => {
    if (!documents) return;
    const historyList = [];
    
    for (const doc of documents) {
      if (!doc.items || !Array.isArray(doc.items)) continue;
      
      const normalize = (str?: string) => (str || '').toString().trim().toLowerCase();
      const match = doc.items.find((item: any) => 
        normalize(product.name) === normalize(item.productName) || 
        (product.code && product.code === item.productId?.toString())
      );
      
      if (match) {
        let customerName = 'Không rõ đối tác';
        if (doc.customerId) {
          try {
            const customer = await db.customers.get(doc.customerId);
            if (customer) customerName = customer.name;
          } catch (e) {}
        }
        
        historyList.push({
          docId: doc.id,
          date: doc.date,
          docNumber: doc.docNumber,
          type: doc.type,
          customerName,
          quantity: match.quantity,
          unitPrice: match.unitPrice,
          taxRate: match.taxRate || 0,
          amount: match.amount || (match.quantity * match.unitPrice)
        });
      }
    }
    
    // Sắp xếp ngày mới nhất lên đầu
    historyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setHistoryModal({
      isOpen: true,
      product,
      history: historyList
    });
  };

  // Tính toán Tổng Mua Vào và Tổng Bán Ra cho từng sản phẩm
  const productStats = useMemo(() => {
    if (!products || !documents) return [];

    const statsMap: Record<number, { totalIn: number, totalOut: number }> = {};
    products.forEach(p => {
      statsMap[p.id!] = { totalIn: 0, totalOut: 0 };
    });

    documents.forEach(doc => {
      if (!doc.items || !Array.isArray(doc.items)) return;
      doc.items.forEach(item => {
        const normalize = (str?: string) => (str || '').toString().trim().toLowerCase();
        const product = products.find(p => 
          normalize(p.name) === normalize(item.productName) || 
          (p.code && p.code === item.productId?.toString())
        );
        
        if (product && product.id) {
          const qty = Number(item.quantity) || 0;
          if (doc.type === 'INPUT_INVOICE') {
            statsMap[product.id].totalIn += qty;
          } else if (doc.type === 'OUTPUT_INVOICE' || doc.type === 'DELIVERY_NOTE') {
            statsMap[product.id].totalOut += qty;
          }
        }
      });
    });

    return products.map(p => ({
      ...p,
      type: p.type || 'PRODUCT',
      category: p.category || '',
      totalIn: statsMap[p.id!].totalIn,
      totalOut: statsMap[p.id!].totalOut
    })).filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
      
      let matchType = false;
      if (activeTab === 'PRODUCT') {
        matchType = p.type === 'PRODUCT' && (p.stock || 0) > 0;
      } else if (activeTab === 'SOLD_OUT') {
        matchType = p.type === 'PRODUCT' && (p.stock || 0) <= 0;
      } else if (activeTab === 'SERVICE') {
        matchType = p.type === 'SERVICE';
      } else if (activeTab === 'EXPENSE') {
        matchType = p.type === 'EXPENSE';
      }
      
      return matchSearch && matchType;
    });
  }, [products, documents, searchQuery, activeTab]);

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateQuotation = () => {
    if (setPrefilledProducts) setPrefilledProducts(selectedIds);
    if (onNavigate) onNavigate('create-quote');
  };

  const startEdit = (product: any) => {
    setEditingId(product.id!);
    setEditName(product.name);
    setEditType(product.type);
    setEditCategory(product.category || '');
  };

  const [dateModal, setDateModal] = useState<{
    isOpen: boolean;
    type: 'BULK' | 'INLINE';
    bulkIds?: number[];
    inlineId?: number;
    inlineOldName?: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const saveEdit = async (productId: number, oldName: string) => {
    const prod = products?.find(p => p.id === productId);
    if (editType === 'EXPENSE' && prod && prod.type !== 'EXPENSE') {
      setDateModal({ isOpen: true, type: 'INLINE', inlineId: productId, inlineOldName: oldName });
      return;
    }
    await executeInlineSave(productId, oldName, undefined);
  };

  const executeInlineSave = async (productId: number, oldName: string, expDate?: Date) => {
    try {
      let extraUpdate: any = {};
      if (expDate) {
        extraUpdate.expenseDate = expDate;
      }

      await db.products.update(productId, { 
        name: editName, 
        type: editType, 
        category: editCategory,
        ...extraUpdate
      });
      
      if (oldName.trim().toLowerCase() !== editName.trim().toLowerCase()) {
        const allDocs = await db.documents.toArray();
        for (const doc of allDocs) {
          let hasChanged = false;
          if (doc.items && Array.isArray(doc.items)) {
            doc.items.forEach(item => {
              if (item.productName.trim().toLowerCase() === oldName.trim().toLowerCase()) {
                item.productName = editName;
                hasChanged = true;
              }
            });
            if (hasChanged) {
              await db.documents.update(doc.id!, { items: doc.items });
            }
          }
        }
      }
      setEditingId(null);
    } catch (err) {
      console.error("Lỗi khi cập nhật sản phẩm:", err);
      alert("Có lỗi xảy ra khi lưu thay đổi.");
    }
  };

  const handleConfirmDateModal = async () => {
    if (!dateModal) return;
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) {
      alert("Ngày chọn không hợp lệ!");
      return;
    }

    if (dateModal.type === 'BULK' && dateModal.bulkIds) {
      for (const id of dateModal.bulkIds) {
        await db.products.update(id, { type: 'EXPENSE', expenseDate: d });
      }
      setSelectedIds([]);
    } else if (dateModal.type === 'INLINE' && dateModal.inlineId) {
      await executeInlineSave(dateModal.inlineId, dateModal.inlineOldName || '', d);
    }
    
    setDateModal(null);
  };



  const handleMarkAsSold = async () => {
    if (selectedIds.length === 0) return;
    let totalValue = 0;
    for (const id of selectedIds) {
      const p = await db.products.get(id);
      if (p) {
        const qty = p.stock > 0 ? p.stock : 1;
        totalValue += qty * p.unitPrice;
      }
    }
    setSoldDocNumber(`PX-${Date.now().toString().slice(-6)}`);
    setSoldTotalAmount(totalValue);
    setSoldModal({ isOpen: true, productIds: selectedIds });
  };

  const handleConfirmSoldModal = async () => {
    if (!soldModal || !soldCustomerId) {
      alert("Vui lòng chọn khách hàng!");
      return;
    }
    const d = new Date(soldDate);
    if (isNaN(d.getTime())) {
      alert("Ngày bán không hợp lệ!");
      return;
    }

    let actualCustomerId = parseInt(soldCustomerId);
    
    if (soldCustomerId === 'RETAIL') {
      let retail = customers?.find(c => c.name.toLowerCase() === 'khách lẻ');
      if (retail && retail.id) {
        actualCustomerId = retail.id;
      } else {
        actualCustomerId = await db.customers.add({ name: 'Khách lẻ', taxCode: '', address: '' }) as number;
      }
    }

    const itemsToSell = [];
    let baseTotal = 0;
    const prods = [];

    for (const id of soldModal.productIds) {
      const prod = await db.products.get(id);
      if (prod) {
        prods.push(prod);
        const sellQty = prod.stock > 0 ? prod.stock : 1;
        baseTotal += sellQty * prod.unitPrice;
      }
    }

    const finalTotal = soldTotalAmount !== '' ? Number(soldTotalAmount) : baseTotal;
    const ratio = baseTotal > 0 ? (finalTotal / baseTotal) : 1;
    let actualTotal = 0;

    for (const prod of prods) {
      const sellQty = prod.stock > 0 ? prod.stock : 1;
      await db.products.update(prod.id!, { stock: 0 });
      
      const adjustedUnitPrice = baseTotal > 0 ? Math.round(prod.unitPrice * ratio) : (prods.length === 1 ? Math.round(finalTotal / sellQty) : 0);
      const amount = sellQty * adjustedUnitPrice;
      actualTotal += amount;
      
      itemsToSell.push({
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit,
        quantity: sellQty,
        unitPrice: adjustedUnitPrice,
        taxRate: prod.taxRate || 0,
        amount: amount
      });
    }

    if (itemsToSell.length > 0) {
      await db.documents.add({
        type: 'OUTPUT_INVOICE',
        docNumber: soldDocNumber.trim() || `PX-${Date.now().toString().slice(-6)}`,
        customerId: actualCustomerId,
        date: d,
        items: itemsToSell,
        subTotal: actualTotal,
        taxAmount: 0,
        total: actualTotal,
        createdAt: new Date(),
        status: 'COMPLETED'
      });
    }

    setSoldModal(null);
    setSelectedIds([]);
    setSoldCustomerId('');
    alert("Đã chuyển thành công sang Đã Bán và lưu thông tin xuất hàng!");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            Danh sách Tồn kho & Chi phí
          </h3>
          <p className="text-sm text-gray-500 mt-1">Dữ liệu được trích xuất tự động từ Hóa đơn điện tử</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Thanh tìm kiếm */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm tên hoặc mã SP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Tabs chuyển đổi */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-hidden">
            <button
              onClick={() => { setActiveTab('PRODUCT'); setSelectedIds([]); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'PRODUCT' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 Tồn kho
            </button>
            <button
              onClick={() => { setActiveTab('SOLD_OUT'); setSelectedIds([]); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'SOLD_OUT' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏷️ Đã bán
            </button>
            <button
              onClick={() => { setActiveTab('EXPENSE'); setSelectedIds([]); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'EXPENSE' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💸 Chi phí HĐ
            </button>
          </div>

          {/* Nút Báo giá & Chuyển đổi */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
              {activeTab === 'PRODUCT' && (
                <>
                  <button 
                    onClick={handleCreateQuotation}
                    className="flex-1 sm:flex-none items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap justify-center flex"
                  >
                    <FileText className="w-4 h-4" />
                    Báo Giá ({selectedIds.length})
                  </button>
                  <button 
                    onClick={handleMarkAsSold}
                    className="flex-1 sm:flex-none items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap justify-center flex"
                  >
                    Chuyển sang Đã Bán
                  </button>
                </>
              )}
              <select
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm cursor-pointer outline-none"
                onChange={async (e) => {
                  const newType = e.target.value;
                  if (!newType) return;
                  
                  const typeName = newType === 'PRODUCT' ? 'Hàng hóa' : newType === 'SERVICE' ? 'Dịch vụ' : 'Chi phí hoạt động';
                  
                  if (newType === 'EXPENSE') {
                    setDateModal({ isOpen: true, type: 'BULK', bulkIds: selectedIds });
                  } else {
                    if (confirm(`Chuyển ${selectedIds.length} mặt hàng đã chọn sang nhóm ${typeName}?`)) {
                      for (const id of selectedIds) {
                        await db.products.update(id, { type: newType as any });
                      }
                      setSelectedIds([]);
                    }
                  }
                  e.target.value = ''; // Reset select
                }}
              >
                <option value="">-- Chuyển nhóm thành --</option>
                <option value="PRODUCT">Hàng hóa</option>
                <option value="SERVICE">Dịch vụ</option>
                <option value="EXPENSE">Chi phí hoạt động</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left w-10 border-r border-gray-200"></th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Mã SP</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[200px]" style={{ resize: 'horizontal' }}>Tên sản phẩm / Dịch vụ</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }}>Phân loại</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[80px]" style={{ resize: 'horizontal' }}>ĐVT</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }}>Đơn giá</div>
              </th>
              <th className="p-0 border-r border-gray-200">
                <div className="px-6 py-3 text-center text-xs font-medium text-blue-600 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Tổng Mua</div>
              </th>
              {activeTab !== 'EXPENSE' && (
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-center text-xs font-medium text-green-600 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Tổng Bán</div>
                </th>
              )}
              {activeTab !== 'SERVICE' && (
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Tồn kho / SL</div>
                </th>
              )}
              <th className="px-4 py-3 text-center min-w-[80px]"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productStats.map((product) => {
              const isEditing = editingId === product.id;
              
              return (
                <tr key={product.id} className={`hover:bg-blue-50 transition-colors cursor-pointer ${selectedIds.includes(product.id!) ? 'bg-blue-50' : ''}`} onDoubleClick={() => openHistoryModal(product)}>
                  <td className="px-4 py-4 text-center border-r border-gray-100">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={false}
                      checked={selectedIds.includes(product.id!)}
                      onChange={() => handleToggleSelect(product.id!)}
                      title="Chọn để thao tác"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100">{product.code || '-'}</td>
                  
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-100 max-w-md">
                    {isEditing ? (
                      <textarea
                        value={editName}
                        onChange={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                          setEditName(e.target.value);
                        }}
                        className="w-full min-w-[250px] border border-blue-400 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none overflow-hidden"
                        rows={1}
                        autoFocus
                      />
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{product.name}</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-center border-r border-gray-100">
                    {isEditing ? (
                      <div className="flex flex-col space-y-2">
                        <select 
                          value={editType} 
                          onChange={e => setEditType(e.target.value as any)}
                          className="border border-blue-400 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm w-full"
                        >
                          <option value="PRODUCT">Hàng hóa</option>
                          <option value="SERVICE">Dịch vụ</option>
                          <option value="EXPENSE">Chi phí HĐ</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="Nhập Nhóm hàng (vd: Phụ tùng)..."
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="border border-blue-400 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm w-full"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-1">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${
                          product.type === 'SERVICE' ? 'bg-purple-100 text-purple-800' : 
                          product.type === 'EXPENSE' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.type === 'SERVICE' ? 'Dịch vụ' : product.type === 'EXPENSE' ? 'Chi phí HĐ' : 'Hàng hóa'}
                        </span>
                        {product.category && (
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 whitespace-nowrap">
                            {product.category}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-r border-gray-100">{product.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-100">{formatNumber(product.unitPrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-600 border-r border-gray-100">{product.totalIn}</td>
                  
                  {activeTab !== 'EXPENSE' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-green-600 border-r border-gray-100">{product.totalOut}</td>
                  )}
                  
                  {activeTab !== 'SERVICE' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900 border-r border-gray-100">
                      <span className={`px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.stock}
                      </span>
                    </td>
                  )}
                  
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <button onClick={() => saveEdit(product.id!, product.name)} className="text-green-600 hover:text-green-900" title="Lưu">
                          <Save className="h-5 w-5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-900" title="Hủy">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      currentUser?.role !== 'VIEWER' && (
                        <button onClick={() => startEdit(product)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Chỉnh sửa tên / loại">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
            
            {productStats.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center">
                    <FileText className="h-10 w-10 text-gray-300 mb-3" />
                    <p>Chưa có sản phẩm hoặc không tìm thấy kết quả phù hợp.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal chọn ngày ghi nhận chi phí */}
      {dateModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Ngày ghi nhận chi phí</h3>
            <p className="text-sm text-gray-600 mb-5">
              Vui lòng chọn ngày để phân bổ chi phí này vào tháng tương ứng trên báo cáo Tài chính.
            </p>
            <input 
              type="date" 
              className="w-full border border-gray-300 rounded-md p-2.5 mb-6 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDateModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmDateModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chuyển trạng thái Đã Bán */}
      {soldModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Chuyển sang Đã Bán</h3>
            <p className="text-sm text-gray-600 mb-5">
              Bạn đang chuyển {soldModal.productIds.length} mặt hàng sang nhóm Đã Bán. Hãy điền thông tin Hóa đơn bán ra để lưu vết.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng / Đối tác</label>
                <select 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  value={soldCustomerId}
                  onChange={e => setSoldCustomerId(e.target.value)}
                >
                  <option value="" disabled>-- Chọn khách hàng --</option>
                  <option value="RETAIL" className="font-bold text-blue-600">Khách lẻ (Tự động thêm vào danh bạ)</option>
                  {customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số Hóa đơn (Mã chứng từ)</label>
                <input 
                  type="text" 
                  placeholder="VD: PX-001234 (Để trống sẽ tạo tự động)"
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  value={soldDocNumber}
                  onChange={e => setSoldDocNumber(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bán</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    value={soldDate}
                    onChange={e => setSoldDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tổng tiền bán được (VNĐ)</label>
                  <input 
                    type="number" 
                    placeholder="Nhập giá bán thực tế..."
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-bold text-green-700"
                    value={soldTotalAmount}
                    onChange={e => setSoldTotalAmount(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 italic mt-1">
                * Việc nhập tổng tiền bán được giúp hệ thống tự động chia tỉ lệ để hạch toán lời lỗ chính xác trên từng mặt hàng.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setSoldModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmSoldModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                disabled={!soldCustomerId}
              >
                Xác nhận Bán
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Lịch sử giao dịch Sản phẩm */}
      {historyModal.isOpen && historyModal.product && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b bg-blue-50">
              <h3 className="text-lg font-bold text-gray-900">
                Lịch sử giao dịch: <span className="text-blue-700">{historyModal.product.name}</span>
              </h3>
              <button onClick={() => setHistoryModal({ ...historyModal, isOpen: false })} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto bg-gray-50 flex-1">
              {historyModal.history.length === 0 ? (
                <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                  <FileText className="h-10 w-10 text-gray-300 mb-3" />
                  <p>Mặt hàng này chưa có lịch sử mua bán nào.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white sticky top-0 shadow-sm">
                    <tr>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Ngày</div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }}>Số HĐ</div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[100px]" style={{ resize: 'horizontal' }}>Loại</div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[200px]" style={{ resize: 'horizontal' }}>Đối tác</div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[80px]" style={{ resize: 'horizontal' }}>SL</div>
                      </th>
                      <th className="p-0 border-r border-gray-200">
                        <div className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }}>Đơn giá</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {historyModal.history.map((h, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">{new Date(h.date).toLocaleDateString('vi-VN')}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-100">{h.docNumber}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            h.type === 'QUOTATION' ? 'bg-purple-100 text-purple-800' :
                            h.type === 'INPUT_INVOICE' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {h.type === 'QUOTATION' ? 'Báo giá' : h.type === 'INPUT_INVOICE' ? 'Mua vào' : 'Bán ra'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 whitespace-normal break-words border-r border-gray-100">{h.customerName}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right border-r border-gray-100">{h.quantity}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right border-r border-gray-100">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(h.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-4 border-t bg-white flex justify-end">
              <button 
                onClick={() => setHistoryModal({ ...historyModal, isOpen: false })}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
