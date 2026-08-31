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
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PRODUCT' | 'SOLD_OUT' | 'SERVICE' | 'EXPENSE'>('PRODUCT');
  
  // Trạng thái đang chỉnh sửa
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'PRODUCT' | 'SERVICE' | 'EXPENSE'>('PRODUCT');
  const [editCategory, setEditCategory] = useState('');

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
    if (confirm(`Chuyển ${selectedIds.length} mặt hàng đã chọn sang nhóm Đã Bán?\n(Thao tác này sẽ thiết lập Tồn kho = 0 để làm sạch danh sách)`)) {
      for (const id of selectedIds) {
        await db.products.update(id, { stock: 0 });
      }
      setSelectedIds([]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            Danh sách Hàng hóa & Dịch vụ
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
              📦 Hàng hóa
            </button>
            <button
              onClick={() => { setActiveTab('SERVICE'); setSelectedIds([]); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'SERVICE' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ⚙️ Dịch vụ
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
              <th className="px-4 py-3 text-left w-10"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã SP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm / Dịch vụ</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Phân loại</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ĐVT</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn giá</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-blue-600 uppercase tracking-wider">Tổng Mua</th>
              {activeTab !== 'EXPENSE' && <th className="px-6 py-3 text-center text-xs font-medium text-green-600 uppercase tracking-wider">Tổng Bán</th>}
              {activeTab !== 'SERVICE' && <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Tồn kho / SL</th>}
              <th className="px-4 py-3 text-center w-16"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productStats.map((product) => {
              const isEditing = editingId === product.id;
              
              return (
                <tr key={product.id} className={`hover:bg-blue-50 transition-colors ${selectedIds.includes(product.id!) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={false}
                      checked={selectedIds.includes(product.id!)}
                      onChange={() => handleToggleSelect(product.id!)}
                      title="Chọn để thao tác"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.code || '-'}</td>
                  
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-md">
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
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
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
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.type === 'SERVICE' ? 'bg-purple-100 text-purple-800' : 
                          product.type === 'EXPENSE' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.type === 'SERVICE' ? 'Dịch vụ' : product.type === 'EXPENSE' ? 'Chi phí HĐ' : 'Hàng hóa'}
                        </span>
                        {product.category && (
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {product.category}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{product.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatNumber(product.unitPrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-600">{product.totalIn}</td>
                  
                  {activeTab !== 'EXPENSE' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-green-600">{product.totalOut}</td>
                  )}
                  
                  {activeTab !== 'SERVICE' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">
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
    </div>
  );
}
